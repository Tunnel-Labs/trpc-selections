import type { SelectionDefinition } from '~/types/selections.js';
import type { SelectInput } from '~/types/select.ts';

/**
	Creates a type-safe wrapper function for defining selections
*/
export function defineSelectionMappings<$DataModel, $TableName extends string>(): {
	set<
		SelectionMappings extends Record<
			`$${string}`,
			SelectInput<$TableName> & { [K in keyof SelectionMappings]?: boolean }
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
