export type ProcedureReturnType<
	ProcedureCallback extends (selection: any) => any
> = Awaited<ReturnType<ProcedureCallback>>;
