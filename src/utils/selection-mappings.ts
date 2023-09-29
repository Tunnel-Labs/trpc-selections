import type { SelectionDefinition } from '../types/selections.js';
import type { SelectInput } from 'typegeese';

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
