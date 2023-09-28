import type { SelectOutput } from "typegeese";
import type { ProcedureReturnType } from "./procedure.js";

export type SchemaFromProcedureCallback<
  ProcedureCallback extends (selection: any) => any
> = Exclude<ProcedureReturnType<ProcedureCallback>, null> extends SelectOutput<
  any,
  any
>[]
  ? NonNullable<
      Exclude<ProcedureReturnType<ProcedureCallback>, null>[number]["__type"]
    >
  : Exclude<ProcedureReturnType<ProcedureCallback>, null> extends SelectOutput<
      any,
      any
    >
  ? NonNullable<Exclude<ProcedureReturnType<ProcedureCallback>, null>["__type"]>
  : never;
