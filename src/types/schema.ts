import type { ProcedureReturnType } from '~/types/procedure.js';
import type { SelectOutput } from '~/types/select.js';

export type SchemaFromProcedureCallback<
	ProcedureCallback extends (selection: any) => any
> = Exclude<ProcedureReturnType<ProcedureCallback>, null> extends SelectOutput<
	any,
	any
>[]
	? NonNullable<
			Exclude<ProcedureReturnType<ProcedureCallback>, null>[number]['__type__']
	  >
	: Exclude<ProcedureReturnType<ProcedureCallback>, null> extends SelectOutput<
			any,
			any
	  >
	? NonNullable<Exclude<ProcedureReturnType<ProcedureCallback>, null>['__type__']>
	: never;
