import type { UmbContentTypeModel, UmbPropertyContainerTypes, UmbPropertyTypeContainerModel } from '../types.js';
import type { UmbContentTypePropertyStructureManager } from './content-type-structure-manager.class.js';
import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbArrayState, UmbBooleanState } from '@umbraco-cms/backoffice/observable-api';

export class UmbContentTypeContainerStructureHelper<T extends UmbContentTypeModel> extends UmbControllerBase {
	#init;
	#initResolver?: (value: unknown) => void;

	#structure?: UmbContentTypePropertyStructureManager<T>;

	private _parentType?: UmbPropertyContainerTypes;
	private _childType?: UmbPropertyContainerTypes = 'Group';
	private _isRoot = false;
	/**
	 * The owner id is the owning container (The container that is begin presented, the container is the parent of the child containers)
	 * If set to null, this helper class will provide containers of the root.
	 */
	private _parentId?: string | null;
	private _parentName?: string;

	// Containers defined in data might be more than actual containers to display as we merge them by name.
	// Direct containers are the containers defining the total of this container(Multiple containers with the same name and type)
	private _parentMatchingContainers: UmbPropertyTypeContainerModel[] = [];
	// Owner containers are containers owned by the owner Content Type (The specific one up for editing)
	private _parentOwnerContainers: UmbPropertyTypeContainerModel[] = [];

	// State containing the merged containers (only one pr. name):
	#containers = new UmbArrayState<UmbPropertyTypeContainerModel>([], (x) => x.id);
	readonly containers = this.#containers.asObservable();

	#hasProperties = new UmbBooleanState(false);
	readonly hasProperties = this.#hasProperties.asObservable();

	constructor(host: UmbControllerHost) {
		super(host);
		this.#init = new Promise((resolve) => {
			this.#initResolver = resolve;
		});

		this.#containers.sortBy((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
	}

	public setStructureManager(structure: UmbContentTypePropertyStructureManager<T>) {
		if (this.#structure === structure) return;
		if (this.#structure) {
			throw new Error(
				'Structure manager is already set, the helpers are not designed to be re-setup with new managers',
			);
		}
		this.#structure = structure;
		this.#initResolver?.(undefined);
		this.#initResolver = undefined;
		this._observeParentAlikeContainers();
	}

	public setParentType(value?: UmbPropertyContainerTypes) {
		if (this._parentType === value) return;
		this._parentType = value;
		this._observeParentAlikeContainers();
	}
	public getParentType() {
		return this._parentType;
	}

	public setContainerChildType(value?: UmbPropertyContainerTypes) {
		if (this._childType === value) return;
		this._childType = value;
		this._observeParentAlikeContainers();
	}
	public getContainerChildType() {
		return this._childType;
	}

	public setName(value?: string) {
		if (this._parentName === value) return;
		this._parentName = value;
		this._observeParentAlikeContainers();
	}
	public getName() {
		return this._parentName;
	}

	public setIsRoot(value: boolean) {
		if (this._isRoot === value) return;
		this._isRoot = value;
		this._observeParentAlikeContainers();
	}
	public getIsRoot() {
		return this._isRoot;
	}

	public setParentId(value: string | null | undefined) {
		if (this._parentId === value) return;
		this._parentId = value;
	}
	public getParentId() {
		return this._parentId;
	}

	private _observeParentAlikeContainers() {
		if (!this.#structure || (!this._isRoot && !this._parentType)) return;

		if (this._isRoot) {
			this.#containers.setValue([]);
			//this._observeChildProperties(); // We cannot have root properties currently, therefor we instead just set it to false:
			this.#hasProperties.setValue(false);
			this._observeRootContainers();
			/*this.observe(
				this.#structure.ownerContainersOf(this._parentType),
				(containers) => {
					this._parentContainers = containers ?? [];
					console.log('root parent containers', this._parentContainers);
					if (this._parentContainers.length !== 1) {
						console.log(
							'!!! We did not just get one parentContainer, I would have expected this, so I have to re-evaluate my understanding.  !!!',
						);
					}
					this._parentAlikeContainers = [];
				},
				'_observeOwnerContainers',
			);*/
		} else if (this._parentName && this._parentType) {
			this.observe(
				this.#structure.containersByNameAndType(this._parentName, this._parentType),
				(parentContainers) => {
					this.#containers.setValue([]);
					this._parentOwnerContainers = parentContainers.filter((x) => x.id === this._parentId) || [];
					this._parentMatchingContainers = parentContainers ?? [];
					console.log('owner containers', this._parentOwnerContainers);
					console.log('matching containers', this._parentMatchingContainers);
					if (this._parentMatchingContainers.length > 0) {
						this._observeChildProperties();
						this._observeChildContainers();
					}
				},
				'_observeOwnerContainers',
			);
		} else {
			throw new Error('Container Structure Helper is not properly configured, missing required properties!!!!!!!!!');
		}
	}

	private _observeChildProperties() {
		if (!this.#structure) return;

		this._parentMatchingContainers.forEach((container) => {
			this.observe(
				this.#structure!.hasPropertyStructuresOf(container.id!),
				(hasProperties) => {
					this.#hasProperties.setValue(hasProperties);
				},
				'_observeOwnerHasProperties_' + container.id,
			);
		});
	}

	private _observeChildContainers() {
		if (!this.#structure || !this._parentName || !this._childType) return;

		this._parentMatchingContainers.forEach((container) => {
			this.observe(
				this.#structure!.containersOfParentKey(container.id, this._childType!),
				this._insertChildContainers,
				'_observeGroupsOf_' + container.id,
			);
		});
	}

	private _observeRootContainers() {
		if (!this.#structure || !this._isRoot) return;

		this.observe(
			this.#structure.rootContainers(this._childType!),
			(rootContainers) => {
				this.#containers.setValue([]);
				this._insertChildContainers(rootContainers);
			},
			'_observeRootContainers',
		);
	}

	private _insertChildContainers = (childContainers: UmbPropertyTypeContainerModel[]) => {
		childContainers.forEach((group) => {
			if (group.name !== null && group.name !== undefined) {
				if (!this.#containers.getValue().find((x) => x.name === group.name)) {
					this.#containers.appendOne(group);
				}
			}
		});
	};

	/**
	 * Returns true if the container is an owner container.
	 */
	/*
	isOwnerContainer(containerId?: string) {
		if (!this.#structure || !containerId) return;

		return this._parentOwnerContainers.find((x) => x.id === containerId) !== undefined;
	}
	*/

	/**
	 * Returns true if the container is an owner container.
	 */
	isOwnerChildContainer(containerId?: string) {
		if (!this.#structure || !containerId) return;

		console.log('isOwnerChildContainer', containerId, this._parentId, this._parentOwnerContainers);

		return (
			this.#containers
				.getValue()
				.find((x) => (x.id === containerId && this._parentId ? x.parent?.id === this._parentId : x.parent === null)) !==
			undefined
		);
	}

	/** Manipulate methods: */

	async insertContainer(container: UmbPropertyTypeContainerModel, sortOrder = 0) {
		await this.#init;
		if (!this.#structure) return false;

		const newContainer = { ...container, sortOrder };

		await this.#structure.insertContainer(null, newContainer);
		return true;
	}

	async addContainer(parentContainerId?: string | null, sortOrder?: number) {
		if (!this.#structure) return;

		await this.#structure.createContainer(null, parentContainerId, this._childType, sortOrder);
	}

	async removeContainer(groupId: string) {
		await this.#init;
		if (!this.#structure) return false;

		await this.#structure.removeContainer(null, groupId);
		return true;
	}

	async partialUpdateContainer(containerId: string, partialUpdate: Partial<UmbPropertyTypeContainerModel>) {
		await this.#init;
		if (!this.#structure || !containerId || !partialUpdate) return;

		return await this.#structure.updateContainer(null, containerId, partialUpdate);
	}

	async updateContainerName(containerId: string, containerParentId: string | null, name: string) {
		await this.#init;
		if (!this.#structure) return;

		const newName =
			this.#structure.makeContainerNameUniqueForOwnerContentType(name, this._childType, containerParentId) ?? name;

		return await this.partialUpdateContainer(containerId, { name: newName });
	}
}
