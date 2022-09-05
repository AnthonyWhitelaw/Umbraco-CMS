import { BehaviorSubject, Observable } from 'rxjs';
import type { UmbEntityStore } from '../../core/stores/entity.store';
import { Entity } from '../../mocks/data/entity.data';

export interface UmbTreeContext {
	entityStore: UmbEntityStore;
	readonly selectable: Observable<boolean>;
	readonly selection: Observable<Array<string>>;
	fetchRoot?(): Observable<Entity[]>;
	fetchChildren?(key: string): Observable<Entity[]>;
	setSelectable(value: boolean): void;
	select(key: string): void;
}

export class UmbTreeContextBase implements UmbTreeContext {
	public entityStore: UmbEntityStore;

	private _selectable: BehaviorSubject<boolean> = new BehaviorSubject(false);
	public readonly selectable: Observable<boolean> = this._selectable.asObservable();

	private _selection: BehaviorSubject<Array<string>> = new BehaviorSubject(<Array<string>>[]);
	public readonly selection: Observable<Array<string>> = this._selection.asObservable();

	constructor(entityStore: UmbEntityStore) {
		this.entityStore = entityStore;
	}

	public setSelectable(value: boolean) {
		this._selectable.next(value);
	}

	public setSelection(value: Array<string>) {
		this._selection.next(value);
	}

	public select(key: string) {
		const selection = this._selection.getValue();
		this._selection.next([...selection, key]);
	}
}
