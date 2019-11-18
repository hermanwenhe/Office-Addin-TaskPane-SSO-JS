/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global $, OfficeRuntime */

import { handleAADErrors, handleClientSideErrors } from "./errorHandler";
import { MSGraphHelper } from './../../node_modules/office-addin-sso/lib/msgraph-helper';
import { showMessage } from "./../../node_modules/office-addin-sso/lib/message-helper";
import { writeDataToOfficeDocument } from "./../taskpane/taskpane";

export async function getGraphData(): Promise<void> {
  try {
    let bootstrapToken: string = await OfficeRuntime.auth.getAccessToken({
      allowSignInPrompt: true,
      forMSGraphAccess: true
    });
    let exchangeResponse: any = await MSGraphHelper.getGraphToken(bootstrapToken);
    if (exchangeResponse.claims) {
      // Microsoft Graph requires an additional form of authentication. Have the Office host
      // get a new token using the Claims string, which tells AAD to prompt the user for all
      // required forms of authentication.
      let mfaBootstrapToken: string = await OfficeRuntime.auth.getAccessToken({
        authChallenge: exchangeResponse.claims
      });
      exchangeResponse = MSGraphHelper.getGraphToken(mfaBootstrapToken);
    }

    if (exchangeResponse.error) {
      // AAD errors are returned to the client with HTTP code 200, so they do not trigger
      // the catch block below.
      handleAADErrors(exchangeResponse);
    } else {
      // makeGraphApiCall makes an AJAX call to the MS Graph endpoint. Errors are caught
      // in the .fail callback of that call
      const response: any = await MSGraphHelper.makeGraphApiCall(exchangeResponse.access_token);
      writeDataToOfficeDocument(response);
      showMessage("Your data has been added to the document.");
    }
  } catch (exception) {
    // The only exceptions caught here are exceptions in your code in the try block
    // and errors returned from the call of `getAccessToken` above.
    if (exception.code) {
      handleClientSideErrors(exception);
    } else {
      showMessage("EXCEPTION: " + JSON.stringify(exception));
    }
  }
}
