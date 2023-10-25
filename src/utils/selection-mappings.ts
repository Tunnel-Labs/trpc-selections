import type { SelectionDefinition } from '~/types/selections.js';
import type { SelectInputFromDataModel } from '~/types/select.js';

/**
	Creates a type-safe wrapper function for defining selections
*/
export function defineSelectionMappings<
	$DataModel,
	$TableName extends string
>(): {
	set<
		SelectionMappings extends Record<
			`$${string}`,
			SelectInputFromDataModel<$DataModel, $TableName> & {
				[K in keyof SelectionMappings]?: boolean;
			}
		>
	>(
		mappings: () => SelectionMappings
	): () => SelectionDefinition<
		SelectInputFromDataModel<$DataModel, $TableName>,
		SelectionMappings
	>;
} {
	return {
		set(cb: () => any) {
			return cb;
		}
	} as any;
}
