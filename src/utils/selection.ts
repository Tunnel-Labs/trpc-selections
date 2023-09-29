import { deepmerge } from 'deepmerge-ts';
import type { UnionToIntersection } from 'type-fest';
import mapObject, { mapObjectSkip } from 'map-obj';
import { merge } from 'merge';

import type {
	SelectionDefinition,
	ExpandSelections
} from '~/types/selections.js';

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

export function unscopeSelections<Selections extends Record<string, () => any>>(
	selections: Selections
): {
	[SelectionIdentifier in keyof Selections as SelectionIdentifier extends `${string}_${infer UnscopedIdentifier}`
		? UnscopedIdentifier
		: never]: ReturnType<Selections[SelectionIdentifier]>;
} {
	return mapObject(selections, (key, selection) => {
		if (key === 'default') {
			return mapObjectSkip;
		}

		const identifier = (key as string).split('_')[1];

		if (identifier === undefined) {
			throw new Error(`Invalid selection identifier: ${String(key)}`);
		}

		return [identifier, selection()];
	}) as any;
}

export function combineSelections<
	Selections extends Array<Record<string, any>>
>(...selections: Selections): UnionToIntersection<Selections[number]> {
	return merge(...selections);
}
