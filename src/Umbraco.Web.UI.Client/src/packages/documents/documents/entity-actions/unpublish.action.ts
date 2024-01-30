import type { UmbDocumentPublishingRepository } from '../repository/index.js';
import { UmbEntityActionBase } from '@umbraco-cms/backoffice/entity-action';
import type { UmbControllerHostElement } from '@umbraco-cms/backoffice/controller-api';

export class UmbUnpublishDocumentEntityAction extends UmbEntityActionBase<UmbDocumentPublishingRepository> {
	constructor(host: UmbControllerHostElement, repositoryAlias: string, unique: string, entityType: string) {
		super(host, repositoryAlias, unique, entityType);
	}

	async execute() {
		console.log(`unpublish: ${this.unique}`);
		// TODO: implement dialog or something to handle variants.
		//await this.repository?.unpublish();
	}
}
