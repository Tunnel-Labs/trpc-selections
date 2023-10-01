import hash from 'object-hash';
import type { SelectInput, SelectOutput } from 'typegeese';
import type { SchemaFromProcedureCallback } from '~/types/schema.js';
import type { ProcedureReturnType } from '~/types/procedure.js';

export function createWithSelection({
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
