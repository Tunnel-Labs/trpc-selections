#!/usr/bin/env -S pnpm exec tsx

// @ts-check

import fs from "node:fs";

import { parse } from "@typescript-eslint/typescript-estree";
import { walk } from "estree-walker";
import { execa } from "execa";
import glob from "fast-glob";
import { getMonorepoDirpath } from "get-monorepo-root";
import json5 from "json5";
import hash from "object-hash";
import path from "pathe";
import sortKeys from "sort-keys";
import { rgPath } from "@vscode/ripgrep";
import yaml from "yaml";

export async function getSelectionHashes({
  selectionDefinitions,
  selections,
}: {
  selectionDefinitions: any;
  selections: any;
}) {
  const monorepoDirpath = getMonorepoDirpath(import.meta.url);
  if (monorepoDirpath === undefined) {
    throw new Error("Could not find monorepo dirpath");
  }

  const packageGlobPatterns: string[] = yaml.parse(
    await fs.promises.readFile(
      path.join(monorepoDirpath, "pnpm-workspace.yaml"),
      "utf8"
    )
  ).packages;

  const packageDirpaths = await glob(
    packageGlobPatterns.map((globPattern) =>
      path.join(monorepoDirpath, globPattern)
    ),
    {
      cwd: monorepoDirpath,
      absolute: true,
      onlyDirectories: true,
    }
  );

  const packageSrcDirpaths = packageDirpaths
    .map((packageDirpath) => path.join(packageDirpath, "src"))
    .filter(
      (packageSrcDirpath) =>
        fs.existsSync(packageSrcDirpath) &&
        // Don't include our complex selections
        packageSrcDirpath !== path.join(monorepoDirpath, "api/selections/src")
    );

  /*
	Finds all files with the string `} satisfies SelectInput<` in them
*/
  const { stdout: selectInputFilepathsStdout } = await execa(
    rgPath,
    [
      "--files-with-matches",
      "}\\)? satisfies SelectInput<",
      ...packageSrcDirpaths,
    ],
    { stdio: "pipe" }
  );

  const selectInputFilepaths = selectInputFilepathsStdout.split("\n");

  const { stdout: withSelectionsFilepathsStdout } = await execa(
    rgPath,
    ["--files-with-matches", "withSelection\\(", ...packageSrcDirpaths],
    { stdio: "pipe" }
  );
  const withSelectionsFilepaths = withSelectionsFilepathsStdout.split("\n");

  const selectionObjects: Record<string, unknown>[] = [];

  await Promise.all([
    ...selectInputFilepaths.map(async (selectInputFilepath) => {
      const selectInputFileContents = await fs.promises.readFile(
        selectInputFilepath,
        "utf8"
      );

      let body: any[];
      try {
        ({ body } = parse(selectInputFileContents, {
          range: true,
        }));
      } catch {
        throw new Error(`Could not parse file "${selectInputFilepath}"`);
      }

      for (const node of body) {
        walk(node, {
          enter(node: any) {
            if (node.type === "TSSatisfiesExpression") {
              selectionObjects.push(
                json5.parse(
                  selectInputFileContents.slice(...node.expression.range)
                )
              );
            }
          },
        });
      }
    }),
    ...withSelectionsFilepaths.map(async (withSelectionsFilepath) => {
      const withSelectionFileContents = await fs.promises.readFile(
        withSelectionsFilepath,
        "utf8"
      );

      let body: any[];
      try {
        ({ body } = parse(withSelectionFileContents, {
          range: true,
          jsx: true,
        }));
      } catch {
        throw new Error(`Could not parse file "${withSelectionsFilepath}"`);
      }

      for (const node of body) {
        walk(node, {
          enter(node: any) {
            if (
              node.type === "CallExpression" &&
              node.callee.name === "withSelection"
            ) {
              const secondArgument = node.arguments[1];
              if (secondArgument.type === "ObjectExpression") {
                selectionObjects.push(
                  json5.parse(
                    withSelectionFileContents.slice(...node.arguments[1].range)
                  )
                );
              } else if (secondArgument.type === "Identifier") {
                // Identifiers are already handled via the `selectInputFilepaths` branch
              } else if (secondArgument.type === "CallExpression") {
                if (secondArgument.callee.object?.name !== "selections") {
                  throw new Error(
                    `Only \`selections.model\` calls are supported as the second argument to "withSelection"; received ${secondArgument.callee.name}`
                  );
                }

                const modelName = secondArgument.callee.property.name;

                const selectionObjectAst = secondArgument.arguments[0];
                if (selectionObjectAst?.type !== "ObjectExpression") {
                  throw new Error(
                    `The argument to \`selections.model({ ... })\` calls must be an inline object. Received: ${secondArgument.arguments[0]?.type}`
                  );
                }

                const expandCallSelection = ({
                  callExpressionAst,
                }: {
                  callExpressionAst: any;
                }) => {
                  if (callExpressionAst.callee.object?.name !== "selections") {
                    throw new Error(
                      `Only \`selections.model\` calls are supported as the second argument to "withSelection"; received ${callExpressionAst.callee.object?.name}`
                    );
                  }

                  const modelName = callExpressionAst.callee.property.name;
                  const selectionObjectArgumentAst =
                    callExpressionAst.arguments[0];
                  if (selectionObjectArgumentAst?.type !== "ObjectExpression") {
                    throw new Error(
                      `The argument to \`selections.model({ ... })\` calls must be an inline object. Received: ${selectionObjectArgumentAst?.type}`
                    );
                  }

                  return (selections as any)[modelName](
                    expandSelectionFunctions({
                      modelName,
                      currentSelectionObjectAst: selectionObjectArgumentAst,
                    })
                  );
                };

                const expandSelectionFunctions = ({
                  modelName,
                  currentSelectionObjectAst,
                }: {
                  modelName: string;
                  currentSelectionObjectAst: any;
                }): Record<string, unknown> => {
                  const expandedSelectionObject: Record<string, unknown> = {};

                  for (const selectionObjectAstProperty of currentSelectionObjectAst.properties) {
                    const key = selectionObjectAstProperty.key.name;
                    const valueAst = selectionObjectAstProperty.value;

                    if (valueAst.type === "ObjectExpression") {
                      expandedSelectionObject[key] = expandSelectionFunctions({
                        modelName,
                        currentSelectionObjectAst: valueAst,
                      });
                    } else if (valueAst.type === "CallExpression") {
                      expandedSelectionObject[key] = expandCallSelection({
                        callExpressionAst: valueAst,
                      });
                    } else if (valueAst.type === "Literal") {
                      expandedSelectionObject[key] = valueAst.value;
                    } else {
                      throw new Error(
                        `The properties in the selection object must be one of "ObjectExpression", "CallExpression", or "Literal". Received: ${valueAst.type}`
                      );
                    }
                  }

                  return expandedSelectionObject;
                };

                const expandedSelectionFunctionsObject =
                  expandSelectionFunctions({
                    currentSelectionObjectAst: selectionObjectAst,
                    modelName,
                  });

                const expandedSelectionsObject = (selections as any)[modelName](
                  expandedSelectionFunctionsObject
                );

                selectionObjects.push(expandedSelectionsObject);
              }
            }
          },
        });
      }
    }),
  ]);

  const selectionHashes: Record<string, any> = {};

  for (const selectionObject of selectionObjects) {
    selectionHashes[hash.sha1(selectionObject)] = selectionObject;
  }

  // Add our complex selections
  for (const selectionDefinition of Object.values(selectionDefinitions)) {
    if (selectionDefinition.name.includes("_")) {
      const selection = selectionDefinition();
      selectionHashes[hash.sha1(selection)] = selection;
    }
  }

  return sortKeys(selectionHashes);
}
