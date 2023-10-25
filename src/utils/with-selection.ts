import hash from 'object-hash';
import type {
	SelectInputFromDataModel,
	SelectOutputFromDataModel
} from '~/types/select.js';
import type { SchemaFromProcedureCallback } from '~/types/schema.js';
import type { ProcedureReturnType } from '~/types/procedure.js';

export function createWithSelection<$DataModel>({
	selectionHashes
}: {
	selectionHashes: Record<string, unknown>;
}) {
	return function withSelection<
		$ProcedureCallback extends (selection: string) => any,
		const Selection extends SelectInputFromDataModel<
			$DataModel,
			SchemaFromProcedureCallback<$DataModel, $ProcedureCallback>
		>
	>(
		cb: $ProcedureCallback,
		selection: Selection
	): Promise<
		| (ProcedureReturnType<$ProcedureCallback> extends Array<any>
				? SelectOutputFromDataModel<
						$DataModel,
						SchemaFromProcedureCallback<$DataModel, $ProcedureCallback>,
						Selection
				  >[]
				: SelectOutputFromDataModel<
						$DataModel,
						SchemaFromProcedureCallback<$DataModel, $ProcedureCallback>,
						Selection
				  >)
		| (null extends ProcedureReturnType<$ProcedureCallback> ? null : never)
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
