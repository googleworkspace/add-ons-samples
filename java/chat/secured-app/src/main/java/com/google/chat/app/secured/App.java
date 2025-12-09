/**
 * Copyright 2025 Google LLC
 *
 * <p>Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of the License at
 *
 * <p>http://www.apache.org/licenses/LICENSE-2.0
 *
 * <p>Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.google.chat.app.secured;

import java.util.Collections;
import java.util.logging.Logger;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.api.client.json.GenericJson;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.apache.ApacheHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.chat.v1.model.Message;

@SpringBootApplication
@RestController
public class App {

  // Service account email to verify requests from
  static String SERVICE_ACCOUNT_EMAIL = "your-add-on-service-account-email";

  // Endpoint URL of the add-on
  static String HTTP_ENDPOINT = "your-add-on-endpoint-url";

  private static final Logger logger = Logger.getLogger(App.class.getName());

  public static void main(String[] args) {
    SpringApplication.run(App.class, args);
  }

  // Returns a simple text message app response based on whether the request is verified or not.
  @PostMapping("/")
  @ResponseBody
  public GenericJson onEvent(
      @RequestBody JsonNode event, @RequestHeader("Authorization") String authorization)
      throws Exception {
    return new GenericJson() {{
      put("hostAppDataAction", new GenericJson() {{
        put("chatDataAction", new GenericJson() {{
          put("createMessageAction", new GenericJson() {{
            put("message", new Message()
              .setText(verifyAddOnRequest(event, authorization) ? "Successful verification!" : "Failed verification!"));
          }});
        }});
      }});
    }};
  }

  // [START verify_add_on_request]
  /**
   * Determine whether a Google Workspace add-on request is legitimate.
   * 
   * @param event Event sent from Google Workspace add-on
   * @param authorization Authorization header from the request
   * @return {boolean} Whether the request is legitimate
   */
  private boolean verifyAddOnRequest(JsonNode event, String authorization) throws Exception {
    JsonFactory factory = JacksonFactory.getDefaultInstance();

    GoogleIdTokenVerifier verifier =
      new GoogleIdTokenVerifier.Builder(new ApacheHttpTransport(), factory)
        .setAudience(Collections.singletonList(HTTP_ENDPOINT))
        .build();

    String bearer = authorization.substring("Bearer ".length(), authorization.length());
    GoogleIdToken idToken = GoogleIdToken.parse(factory, bearer);
    return idToken != null
      && verifier.verify(idToken)
      && idToken.getPayload().getEmailVerified()
      && idToken.getPayload().getEmail().equals(SERVICE_ACCOUNT_EMAIL);
  }
  // [END verify_add_on_request]
}
