import hash from 'object-hash';
import type { SelectInput, SelectOutput } from 'typegeese';

import { deepmerge } from 'deepmerge-ts';
import type { UnionToIntersection } from 'type-fest';

import type {
	SelectionDefinition,
	ExpandSelections
} from '../types/selections.js';
import type { ProcedureReturnType } from '../types/procedure.js';
import type { SchemaFromProcedureCallback } from '../types/schema.js';

export function expandSelections<
	SelectionMapping extends Record<string, Record<string, unknown>>
>(selectionMapping: SelectionMapping): ExpandSelections<SelectionMapping> {
	function expandInnerSelection(mapping: Record<string, unknown>): void {
		for (const mappingKey of Object.keys(mapping)) {
			if (mappingKey.startsWith('$')) {
				expandInnerSelection(selectionMapping[mappingKey] ?? {});
				Object.assign(mapping, selectionMapping[mappingKey]);
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- We need to delete the key
				delete mapping[mappingKey];
			}
		}
	}

	for (const topLevelMappingValue of Object.values(selectionMapping)) {
		expandInnerSelection(topLevelMappingValue);
	}

	return selectionMapping as any;
}

export function createSelectionFunction<
	Definition extends SelectionDefinition<any, any>
>(selectionDefinition: Definition) {
	type Select = Definition extends SelectionDefinition<infer Select, any>
		? Select
		: never;
	type SelectionMappings = Definition extends SelectionDefinition<
		any,
		infer SelectionMappings
	>
		? SelectionMappings
		: never;

	type ExpandedSelections = ExpandSelections<SelectionMappings>;

	const expandedSelections = expandSelections(selectionDefinition as any);

	return function select<
		Selections extends Select & {
			[K in keyof SelectionMappings]?: boolean | undefined;
		}
	>(
		selections: Selections
	): UnionToIntersection<
		{
			[SelectionKey in keyof Selections]: SelectionKey extends `$${string}`
				? ExpandedSelections[SelectionKey]
				: Record<SelectionKey, Selections[SelectionKey]>;
		}[keyof Selections]
	> {
		const selectionsArray: any[] = [];

		for (const [selectionKey, selectionValue] of Object.entries(selections)) {
			if (selectionKey.startsWith('$')) {
				selectionsArray.push((expandedSelections as any)[selectionKey]);
			} else {
				selectionsArray.push({ [selectionKey]: selectionValue });
			}
		}

		return deepmerge(...selectionsArray) as any;
	};
}

/**
	Creates a type-safe wrapper function for defining selections
*/
export function defineSelectionMappings<Model>(): {
	set<
		SelectionMappings extends Record<
			`$${string}`,
			SelectInput<Model> & { [K in keyof SelectionMappings]?: boolean }
		>
	>(
		mappings: () => SelectionMappings
	): () => SelectionDefinition<SelectInput<Model>, SelectionMappings>;
} {
	return {
		set(cb: () => any) {
			return cb;
		}
	} as any;
}

export async function createWithSelection({
	selectionHashes
}: {
	selectionHashes: Record<string, unknown>;
}) {
	return function withSelection<
		ProcedureCallback extends (selection: string) => any,
		const Selection extends SelectInput<
			SchemaFromProcedureCallback<ProcedureCallback>
		>
	>(
		cb: ProcedureCallback,
		selection: Selection
	): Promise<
		| (ProcedureReturnType<ProcedureCallback> extends Array<any>
				? SelectOutput<
						SchemaFromProcedureCallback<ProcedureCallback>,
						Selection
				  >[]
				: SelectOutput<
						SchemaFromProcedureCallback<ProcedureCallback>,
						Selection
				  >)
		| (null extends ProcedureReturnType<ProcedureCallback> ? null : never)
	> {
		const selectionHash = hash.sha1(selection);
		if (selectionHashes[selectionHash] === undefined) {
			// eslint-disable-next-line no-console -- bruh
			console.error('Selection not found in selectionHashes', selection);
			throw new Error(
				`Selection hash ${selectionHash} not found in selectionHashes`
			);
		}

		return cb(selectionHash);
	};
}
