import type { UnionToIntersection } from 'type-fest';
import type { SelectInputFromDataModel } from '~/types/select.js';

export interface SelectionDefinition<
	_$Select,
	_$SelectionMappings extends Record<`$${string}`, unknown>
> extends Record<`$${string}`, unknown> {}

export type InferSelectionDefinition<
	$SelectionDefinitionGetter extends (...args: any) => any
> = Awaited<ReturnType<$SelectionDefinitionGetter>>;

// prettier-ignore
export type ExpandMapping<$SelectionMappings, $Options> = {
	[$OptionKey in keyof $Options]:
		$OptionKey extends keyof $SelectionMappings ?
			ExpandMapping<$SelectionMappings, $SelectionMappings[$OptionKey]> :
		Record<$OptionKey, $Options[$OptionKey]>;
}[keyof $Options];

// prettier-ignore
export type SelectionSelect<
	$Definition extends SelectionDefinition<any, any>,
	$Options
> =
	$Definition extends SelectionDefinition<any, infer $SelectionMappings> ?
		UnionToIntersection<ExpandMapping<$SelectionMappings, $Options>> :
	never;

// prettier-ignore
export type WithOptions<
	$DataModel,
	$Definition extends SelectionDefinition<any, any>,
	$TableName extends string
> =
	$Definition extends SelectionDefinition<any, infer $SelectionMappings> ?
		SelectInputFromDataModel<$DataModel, $TableName> &
		{ [Key in keyof $SelectionMappings]?: boolean } :
	never;

// prettier-ignore
export type Selections<$SelectionMappingObject> = keyof {
	[
		$K in keyof $SelectionMappingObject as $K extends `$${string}` ?
			$K :
		never
	]: true
};

// prettier-ignore
export type RecursivelyExpandSelection<
	SelectionMapping,
	SelectionMappingObject
> = Omit<SelectionMappingObject, `$${string}`> &
	(Selections<SelectionMappingObject> extends never
		? // eslint-disable-next-line @typescript-eslint/ban-types -- We need to intersect with the empty object type
		  {}
		: {
				[K in Selections<SelectionMappingObject>]: K extends keyof SelectionMapping
					? SelectionMapping[K]
					: never;
		  }[Selections<SelectionMappingObject>]);

export type ExpandSelections<
	SelectionMappings extends Record<string, Record<string, unknown>>
> = {
	[Key in keyof SelectionMappings]: RecursivelyExpandSelection<
		SelectionMappings,
		SelectionMappings[Key]
	>;
};
