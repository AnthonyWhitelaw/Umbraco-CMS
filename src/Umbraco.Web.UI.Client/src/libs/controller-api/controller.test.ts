import { expect } from '@open-wc/testing';
import { UmbControllerHostElement, UmbControllerHostMixin } from './controller-host.mixin.js';
import { UmbBaseController } from './controller.class.js';
import { customElement } from '@umbraco-cms/backoffice/external/lit';

@customElement('test-my-controller-host')
export class UmbTestControllerHostElement extends UmbControllerHostMixin(HTMLElement) {}

export class UmbTestControllerImplementationElement extends UmbBaseController {
	testIsConnected = false;
	testIsDestroyed = false;

	hostConnected(): void {
		super.hostConnected();
		this.testIsConnected = true;
	}
	hostDisconnected(): void {
		super.hostDisconnected();
		this.testIsConnected = false;
	}

	public destroy(): void {
		super.destroy();
		this.testIsDestroyed = true;
	}
}

describe('UmbController', () => {
	type NewType = UmbControllerHostElement;

	let hostElement: NewType;

	beforeEach(() => {
		hostElement = document.createElement('test-my-controller-host') as UmbControllerHostElement;
	});

	describe('Public API', () => {
		describe('methods', () => {
			it('has an getElement method', () => {
				expect(hostElement).to.have.property('getElement').that.is.a('function');
			});

			/*
				hasController(controller: UmbController): boolean;
	getControllers(filterMethod: (ctrl: UmbController) => boolean): UmbController[];
	addController(controller: UmbController): void;
	removeControllerByAlias(unique: UmbController['controllerAlias']): void;
	removeController(controller: UmbController): void;

	hostConnected(): void;
	hostDisconnected(): void;
	destroy(): void;
			*/
		});
	});

	describe('Controllers lifecycle', () => {
		it('controller is removed from host when destroyed', () => {
			const ctrl = new UmbTestControllerImplementationElement(hostElement, 'my-test-context');

			expect(hostElement.hasController(ctrl)).to.be.true;

			ctrl.destroy();

			expect(hostElement.hasController(ctrl)).to.be.false;
		});

		it('controller is destroyed when removed from host', () => {
			const ctrl = new UmbTestControllerImplementationElement(hostElement, 'my-test-context');

			expect(ctrl.testIsDestroyed).to.be.false;
			expect(hostElement.hasController(ctrl)).to.be.true;

			hostElement.removeController(ctrl);

			expect(ctrl.testIsDestroyed).to.be.true;
			expect(hostElement.hasController(ctrl)).to.be.false;
		});

		it('hostConnected & hostDisconnected is triggered accordingly to the state of the controller host.', () => {
			const ctrl = new UmbTestControllerImplementationElement(hostElement, 'my-test-context');

			expect(hostElement.hasController(ctrl)).to.be.true;
			expect(ctrl.testIsConnected).to.be.false;

			document.body.appendChild(hostElement);

			expect(ctrl.testIsConnected).to.be.true;

			document.body.removeChild(hostElement);

			expect(ctrl.testIsConnected).to.be.false;
		});
	});

	describe('Controllers against other Controller', () => {
		it('controller is replaced by another controller using the same string as alias', () => {
			const firstCtrl = new UmbTestControllerImplementationElement(hostElement, 'my-test-context');
			const secondCtrl = new UmbTestControllerImplementationElement(hostElement, 'my-test-context');

			expect(hostElement.hasController(firstCtrl)).to.be.false;
			expect(hostElement.hasController(secondCtrl)).to.be.true;
		});

		it('controller is replaced by another controller using the the same symbol as alias', () => {
			const mySymbol = Symbol();
			const firstCtrl = new UmbTestControllerImplementationElement(hostElement, mySymbol);
			const secondCtrl = new UmbTestControllerImplementationElement(hostElement, mySymbol);

			expect(hostElement.hasController(firstCtrl)).to.be.false;
			expect(hostElement.hasController(secondCtrl)).to.be.true;
		});

		it('controller is not replacing another controller when using the undefined as alias', () => {
			const firstCtrl = new UmbTestControllerImplementationElement(hostElement, undefined);
			const secondCtrl = new UmbTestControllerImplementationElement(hostElement, undefined);

			expect(hostElement.hasController(firstCtrl)).to.be.true;
			expect(hostElement.hasController(secondCtrl)).to.be.true;
		});
	});
});
