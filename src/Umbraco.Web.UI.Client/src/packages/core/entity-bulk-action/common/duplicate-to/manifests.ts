import { manifest as duplicateToKindManifest } from './duplicate-to.action.kind.js';
import type { UmbExtensionManifestKind } from '@umbraco-cms/backoffice/extension-registry';

export const manifests: Array<UmbExtensionManifest | UmbExtensionManifestKind> = [duplicateToKindManifest];