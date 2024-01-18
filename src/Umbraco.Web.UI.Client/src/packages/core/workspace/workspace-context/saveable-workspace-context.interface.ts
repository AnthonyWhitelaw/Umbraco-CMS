import type { UmbWorkspaceContextInterface } from './workspace-context.interface.js';
import { Observable } from '@umbraco-cms/backoffice/external/rxjs';

export interface UmbSaveableWorkspaceContextInterface extends UmbWorkspaceContextInterface {
	isNew: Observable<boolean | undefined>;
	getIsNew(): boolean | undefined;
	setIsNew(value: boolean): void;
	save(): Promise<void>;
	setValidationErrors?(errorMap: any): void; // TODO: temp solution to bubble validation errors to the UI
	destroy(): void;
}
