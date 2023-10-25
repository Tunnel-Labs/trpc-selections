import type { GenericId } from 'convex/values'
import type { Relation } from '~/types/relation.js';

// prettier-ignore
export type SelectInputFromDataModel<$DataModel, $TableName extends string> = {
	[K in keyof $DataModel[$TableName]['document']]?:
		NonNullable<$DataModel[$TableName]['document'][K]> extends Array<infer $Item> ?
			NonNullable<$Item> extends GenericId<infer $SelectedTableName> ?
				{ select: SelectInputFromDataModel<$DataModel, $SelectedTableName> } :
			NonNullable<$Item> extends Relation<infer $SelectedTableName> ?
				{ select: SelectInputFromDataModel<$DataModel, $SelectedTableName> } :
			true :

		NonNullable<$DataModel[$TableName]['document'][K]> extends GenericId<infer $SelectedTableName> ?
			{ select: SelectInputFromDataModel<$DataModel, $SelectedTableName> } :
		NonNullable<$DataModel[$TableName]['document'][K]> extends Relation<infer $SelectedTableName> ?
			{ select: SelectInputFromDataModel<$DataModel, $SelectedTableName> } :

		true
};

// prettier-ignore
export type SelectOutputFromDataModel<
	$DataModel,
	$TableName extends string,
	$Select extends SelectInputFromDataModel<$DataModel, $TableName>
> = {
	[K in keyof $Select]:
		$Select[K] extends true ?
			K extends keyof $DataModel[$TableName]['document'] ?
				$DataModel[$TableName]['document'] :
			never :

		$Select[K] extends { select: infer $NestedSelect extends SelectInputFromDataModel<$DataModel, any> } ?
			K extends keyof $DataModel[$TableName]['document'] ?
				NonNullable<$DataModel[$TableName]['document'][K]> extends GenericId<infer $RefTableName>[] ?
					SelectOutputFromDataModel<$DataModel, $RefTableName, $NestedSelect>[] |
					(null extends $DataModel[$TableName]['document'][K] ? null : never) :
				NonNullable<$DataModel[$TableName]['document'][K]> extends GenericId<infer $RefTableName> ?
					SelectOutputFromDataModel<$DataModel, $RefTableName, $NestedSelect> |
					(null extends NonNullable<$DataModel[$TableName]['document'][K]> ? null : never) :
				never :
			never :
		never
};
