import type { UmbPropertyValueData } from '../types/index.js';
import type { UmbVariantDataModel } from '@umbraco-cms/backoffice/variant';
import type { UmbApi } from '@umbraco-cms/backoffice/extension-api';

export type * from './property-value-resolver.extension.js';

export interface UmbPropertyValueResolver<
	PropertyValueType extends UmbPropertyValueData = UmbPropertyValueData,
	InnerPropertyValueType extends UmbPropertyValueData = PropertyValueType,
	InnerPropertyVariantType extends UmbVariantDataModel = UmbVariantDataModel,
> extends UmbApi {
	processValues?: UmbPropertyValueResolverValuesProcessor<PropertyValueType, InnerPropertyValueType>;
	processVariants?: UmbPropertyValueResolverVariantsProcessor<PropertyValueType, InnerPropertyVariantType>;
	//ensureVariants?: UmbPropertyValueResolverEnsureVariants<PropertyValueType>;
	compareVariants?: (a: InnerPropertyVariantType, b: InnerPropertyVariantType) => boolean;
}

export type UmbPropertyValueResolverValuesProcessor<
	PropertyValueType extends UmbPropertyValueData = UmbPropertyValueData,
	InnerPropertyValueType extends UmbPropertyValueData = PropertyValueType,
> = (
	value: PropertyValueType,
	valuesProcessor: (values: Array<InnerPropertyValueType>) => Promise<Array<InnerPropertyValueType> | undefined>,
) => PromiseLike<PropertyValueType | undefined>;

export type UmbPropertyValueResolverVariantsProcessor<
	PropertyValueType extends UmbPropertyValueData = UmbPropertyValueData,
	InnerPropertyVariantType extends UmbVariantDataModel = UmbVariantDataModel,
> = (
	value: PropertyValueType,
	valuesProcessor: (values: Array<InnerPropertyVariantType>) => Promise<Array<InnerPropertyVariantType> | undefined>,
) => PromiseLike<PropertyValueType | undefined>;

/*
export type UmbPropertyValueResolverEnsureVariants<
	PropertyValueType extends UmbPropertyValueData = UmbPropertyValueData,
> = (
	value: PropertyValueType,
	args: UmbPropertyValueResolverEnsureVariantArgs,
) => PromiseLike<PropertyValueType | undefined>;

export type UmbPropertyValueResolverEnsureVariantArgs = {
	selectedVariants: Array<UmbVariantId>;
};
*/
