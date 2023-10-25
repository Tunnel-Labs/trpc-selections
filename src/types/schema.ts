import type { ProcedureReturnType } from '~/types/procedure.js';
import type { SelectOutputFromDataModel } from '~/types/select.js';

export type SchemaFromProcedureCallback<
	$DataModel,
	$ProcedureCallback extends (selection: any) => any
> = Exclude<
	ProcedureReturnType<$ProcedureCallback>,
	null
> extends SelectOutputFromDataModel<$DataModel, any, any>[]
	? NonNullable<
			Exclude<ProcedureReturnType<$ProcedureCallback>, null>[number]['__type__']
	  >
	: Exclude<
			ProcedureReturnType<$ProcedureCallback>,
			null
	  > extends SelectOutputFromDataModel<$DataModel, any, any>
	? NonNullable<
			Exclude<ProcedureReturnType<$ProcedureCallback>, null>['__type__']
	  >
	: never;
