import { css, html, LitElement } from 'lit';
import { UUITextStyles } from '@umbraco-ui/uui-css/lib';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit-html/directives/if-defined.js';
import { UmbContextConsumerMixin } from '../../../../context';
import type { UmbModalHandler } from '../../modal-handler';
import type { UmbExtensionManifestPropertyEditorUI, UmbExtensionRegistry } from '../../../../extension';
import type { Subscription } from 'rxjs';
import type { UUIComboboxListElement, UUIComboboxListEvent } from '@umbraco-ui/uui';

export interface UmbModalPropertyEditorUIPickerData {
	selection?: Array<string>;
}

@customElement('umb-modal-layout-property-editor-ui-picker')
export class UmbModalLayoutPropertyEditorUIPickerElement extends UmbContextConsumerMixin(LitElement) {
	static styles = [UUITextStyles, css``];

	@property({ attribute: false })
	modalHandler?: UmbModalHandler;

	@property({ type: Object })
	data?: UmbModalPropertyEditorUIPickerData;

	@state()
	private _propertyEditorUIs: Array<UmbExtensionManifestPropertyEditorUI> = [];

	@state()
	private _selection?: Array<string>;

	private _extensionRegistry?: UmbExtensionRegistry;
	private _propertyEditorUIsSubscription?: Subscription;

	constructor() {
		super();

		this.consumeContext('umbExtensionRegistry', (registry) => {
			this._extensionRegistry = registry;
			this._usePropertyEditorUIs();
		});
	}

	connectedCallback(): void {
		super.connectedCallback();

		this._selection = this.data?.selection || [];
	}

	private _usePropertyEditorUIs() {
		this._propertyEditorUIsSubscription = this._extensionRegistry
			?.extensionsOfType('propertyEditorUI')
			.subscribe((propertyEditorUIs) => {
				this._propertyEditorUIs = propertyEditorUIs;
			});
	}

	private _handleChange(event: UUIComboboxListEvent) {
		const target = event.composedPath()[0] as UUIComboboxListElement;
		const value = target.value as string;

		this._selection = value ? [value] : [];
	}

	private _close() {
		this.modalHandler?.close();
	}

	private _submit() {
		this.modalHandler?.close({ selection: this._selection });
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();

		this._propertyEditorUIsSubscription?.unsubscribe();
	}

	render() {
		return html`
			<!-- TODO: maybe we need a layout component between umb-editor-layout and umb-editor-entity? -->
			<umb-editor-entity alias="Umb.Modal.PropertyEditorUIPicker">
				<h3 slot="name">Select Property Editor UI</h3>
				<uui-box>
					<uui-combobox-list value="${ifDefined(this._selection?.[0])}" @change="${this._handleChange}">
						${this._propertyEditorUIs.map(
							(propertyEditorUI) =>
								html`<uui-combobox-list-option style="padding: 8px; margin: 0;" value="${propertyEditorUI.alias}">
									<div style="display: flex; align-items: center;">
										<uui-icon style="margin-right: 5px;" name="${propertyEditorUI.meta.icon}"></uui-icon>
										${propertyEditorUI.name}
									</div>
								</uui-combobox-list-option>`
						)}
					</uui-combobox-list>
				</uui-box>
				<div slot="actions">
					<uui-button label="Close" @click=${this._close}></uui-button>
					<uui-button label="Submit" look="primary" color="positive" @click=${this._submit}></uui-button>
				</div>
			</umb-editor-entity>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'umb-modal-layout-property-editor-ui-picker': UmbModalLayoutPropertyEditorUIPickerElement;
	}
}
