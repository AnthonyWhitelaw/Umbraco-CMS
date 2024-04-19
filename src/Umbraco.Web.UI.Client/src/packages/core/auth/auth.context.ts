import type { UmbBackofficeExtensionRegistry, ManifestAuthProvider } from '../extension-registry/index.js';
import { UmbAuthFlow } from './auth-flow.js';
import { UMB_AUTH_CONTEXT } from './auth.context.token.js';
import type { UmbOpenApiConfiguration } from './models/openApiConfiguration.js';
import { OpenAPI } from '@umbraco-cms/backoffice/external/backend-api';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbContextBase } from '@umbraco-cms/backoffice/class-api';
import { UmbBooleanState } from '@umbraco-cms/backoffice/observable-api';
import { ReplaySubject, filter, switchMap } from '@umbraco-cms/backoffice/external/rxjs';

export class UmbAuthContext extends UmbContextBase<UmbAuthContext> {
	#isAuthorized = new UmbBooleanState<boolean>(false);
	readonly isAuthorized = this.#isAuthorized.asObservable();

	#isInitialized = new ReplaySubject<boolean>(1);
	readonly isInitialized = this.#isInitialized.asObservable().pipe(filter((isInitialized) => isInitialized));

	#isBypassed = false;
	#serverUrl;
	#backofficePath;
	#authFlow;

	constructor(host: UmbControllerHost, serverUrl: string, backofficePath: string, isBypassed: boolean) {
		super(host, UMB_AUTH_CONTEXT);
		this.#isBypassed = isBypassed;
		this.#serverUrl = serverUrl;
		this.#backofficePath = backofficePath;

		this.#authFlow = new UmbAuthFlow(serverUrl, this.getRedirectUrl(), this.getPostLogoutRedirectUrl());
	}

	/**
	 * Initiates the login flow.
	 * @param identityProvider The provider to use for login. Default is 'Umbraco'.
	 * @param usernameHint The username hint to use for login.
	 */
	makeAuthorizationRequest(identityProvider = 'Umbraco', usernameHint?: string) {
		return this.#authFlow.makeAuthorizationRequest(identityProvider, usernameHint);
	}

	/**
	 * Completes the login flow.
	 */
	completeAuthorizationRequest() {
		return this.#authFlow.completeAuthorizationIfPossible();
	}

	/**
	 * Checks if the user is authorized. If Authorization is bypassed, the user is always authorized.
	 * @returns True if the user is authorized, otherwise false.
	 */
	getIsAuthorized() {
		if (this.#isBypassed) {
			this.#isAuthorized.setValue(true);
			return true;
		} else {
			const isAuthorized = this.#authFlow.isAuthorized();
			this.#isAuthorized.setValue(isAuthorized);
			return isAuthorized;
		}
	}

	/**
	 * Sets the initial state of the auth flow.
	 * @returns {Promise<void>}
	 */
	setInitialState(): Promise<void> {
		return this.#authFlow.setInitialState();
	}

	/**
	 * Gets the latest token from the Management API.
	 * If the token is expired, it will be refreshed.
	 *
	 * NB! The user may experience being redirected to the login screen if the token is expired.
	 *
	 * @example <caption>Using the latest token</caption>
	 * ```js
	 *   const token = await authContext.getLatestToken();
	 *   const result = await fetch('https://my-api.com', { headers: { Authorization: `Bearer ${token}` } });
	 * ```
	 *
	 * @memberof UmbAuthContext
	 * @returns The latest token from the Management API
	 */
	getLatestToken(): Promise<string> {
		return this.#authFlow.performWithFreshTokens();
	}

	/**
	 * Clears the token storage.
	 * @memberof UmbAuthContext
	 */
	clearTokenStorage() {
		return this.#authFlow.clearTokenStorage();
	}

	/**
	 * Handles the case where the user has timed out, i.e. the token has expired.
	 * This will clear the token storage and set the user as unauthorized.
	 * @memberof UmbAuthContext
	 */
	timeOut() {
		this.clearTokenStorage();
		this.#isAuthorized.setValue(false);
	}

	/**
	 * Signs the user out by removing any tokens from the browser.
	 * @memberof UmbAuthContext
	 */
	signOut(): Promise<void> {
		return this.#authFlow.signOut();
	}

	/**
	 * Get the server url to the Management API.
	 * @memberof UmbAuthContext
	 * @example <caption>Using the server url</caption>
	 * ```js
	 * 	const serverUrl = authContext.getServerUrl();
	 * 	OpenAPI.BASE = serverUrl;
	 * ```
	 * @example <caption></caption>
	 * ```js
	 * 	const serverUrl = authContext.getServerUrl();
	 * 	const token = await authContext.getLatestToken();
	 * 	const result = await fetch(`${serverUrl}/umbraco/management/api/v1/my-resource`, { headers: { Authorization: `Bearer ${token}` } });
	 * ```
	 * @returns The server url to the Management API
	 */
	getServerUrl() {
		return this.#serverUrl;
	}

	/**
	 * Get the default OpenAPI configuration, which is set up to communicate with the Management API.
	 * @remark This is useful if you want to communicate with your own resources generated by the [openapi-typescript-codegen](https://github.com/ferdikoomen/openapi-typescript-codegen) library.
	 * @memberof UmbAuthContext
	 *
	 * @example <caption>Using the default OpenAPI configuration</caption>
	 * ```js
	 *  	const defaultOpenApi = authContext.getOpenApiConfiguration();
	 *  	OpenAPI.BASE = defaultOpenApi.base;
	 * 		OpenAPI.WITH_CREDENTIALS = defaultOpenApi.withCredentials;
	 * 		OpenAPI.CREDENTIALS = defaultOpenApi.credentials;
	 * 		OpenAPI.TOKEN = defaultOpenApi.token;
	 * ```
	 * @returns The default OpenAPI configuration
	 */
	getOpenApiConfiguration(): UmbOpenApiConfiguration {
		return {
			base: OpenAPI.BASE,
			version: OpenAPI.VERSION,
			withCredentials: OpenAPI.WITH_CREDENTIALS,
			credentials: OpenAPI.CREDENTIALS,
			token: () => this.getLatestToken(),
		};
	}

	setInitialized() {
		this.#isInitialized.next(true);
	}

	getAuthProviders(extensionsRegistry: UmbBackofficeExtensionRegistry) {
		return this.isInitialized.pipe(
			switchMap(() => extensionsRegistry.byType<'authProvider', ManifestAuthProvider>('authProvider')),
		);
	}

	getRedirectUrl() {
		return `${window.location.origin}${this.#backofficePath}`;
	}

	getPostLogoutRedirectUrl() {
		return `${window.location.origin}${this.#backofficePath.endsWith('/') ? this.#backofficePath : this.#backofficePath + '/'}logout`;
	}

	linkLogin(provider: string) {
		return this.#authFlow.linkLogin(provider);
	}

	unlinkLogin(providerName: string, providerKey: string) {
		return this.#authFlow.unlinkLogin(providerName, providerKey);
	}
}
