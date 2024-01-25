/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// [START add_ons_3p_resources]

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.apache.http.client.utils.URIBuilder;

import com.google.cloud.functions.HttpFunction;
import com.google.cloud.functions.HttpRequest;
import com.google.cloud.functions.HttpResponse;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;

public class Create3pResources implements HttpFunction {
  private static final Gson gson = new Gson();

  /**
   * Responds to any HTTP request related to 3p resource creations.
   *
   * @param request  An HTTP request context.
   * @param response An HTTP response context.
   */
  @Override
  public void service(HttpRequest request, HttpResponse response) throws Exception {
    JsonObject event = gson.fromJson(request.getReader(), JsonObject.class);
    JsonObject parameters = event.getAsJsonObject("commonEventObject").getAsJsonObject("parameters");
    if (parameters != null && parameters.has("submitCaseCreationForm") && parameters.get("submitCaseCreationForm").getAsBoolean()) {
      response.getWriter().write(gson.toJson(submitCaseCreationForm(event)));
    } else {
      response.getWriter().write(gson.toJson(createCaseInputCard(event, new HashMap<String, String>(), false)));
    }
  }

  // [START add_ons_3p_resources_create_case_card]

  /**
   * Produces a support case creation form.
   * 
   * @param event The event object.
   * @param errors A map of per-field error messages.
   * @param isUpdate Whether to return the form as an update card navigation.
   * @return The resulting card or action response.
   */
  JsonObject createCaseInputCard(JsonObject event, Map<String, String> errors, boolean isUpdate) {
    JsonObject cardHeader = new JsonObject();
    cardHeader.add("title", new JsonPrimitive("Create a support case"));

    JsonObject cardSectionTextInput1 = new JsonObject();
    cardSectionTextInput1.add("name", new JsonPrimitive("name"));
    cardSectionTextInput1.add("label", new JsonPrimitive("Name"));

    JsonObject cardSectionTextInput1Widget = new JsonObject();
    cardSectionTextInput1Widget.add("textInput", cardSectionTextInput1);

    JsonObject cardSectionTextInput2 = new JsonObject();
    cardSectionTextInput2.add("name", new JsonPrimitive("description"));
    cardSectionTextInput2.add("label", new JsonPrimitive("Description"));
    cardSectionTextInput2.add("type", new JsonPrimitive("MULTIPLE_LINE"));

    JsonObject cardSectionTextInput2Widget = new JsonObject();
    cardSectionTextInput2Widget.add("textInput", cardSectionTextInput2);

    JsonObject cardSectionSelectionInput1ItemsItem1 = new JsonObject();
    cardSectionSelectionInput1ItemsItem1.add("text", new JsonPrimitive("P0"));
    cardSectionSelectionInput1ItemsItem1.add("value", new JsonPrimitive("P0"));

    JsonObject cardSectionSelectionInput1ItemsItem2 = new JsonObject();
    cardSectionSelectionInput1ItemsItem2.add("text", new JsonPrimitive("P1"));
    cardSectionSelectionInput1ItemsItem2.add("value", new JsonPrimitive("P1"));

    JsonObject cardSectionSelectionInput1ItemsItem3 = new JsonObject();
    cardSectionSelectionInput1ItemsItem3.add("text", new JsonPrimitive("P2"));
    cardSectionSelectionInput1ItemsItem3.add("value", new JsonPrimitive("P2"));

    JsonObject cardSectionSelectionInput1ItemsItem4 = new JsonObject();
    cardSectionSelectionInput1ItemsItem4.add("text", new JsonPrimitive("P3"));
    cardSectionSelectionInput1ItemsItem4.add("value", new JsonPrimitive("P3"));

    JsonArray cardSectionSelectionInput1Items = new JsonArray();
    cardSectionSelectionInput1Items.add(cardSectionSelectionInput1ItemsItem1);
    cardSectionSelectionInput1Items.add(cardSectionSelectionInput1ItemsItem2);
    cardSectionSelectionInput1Items.add(cardSectionSelectionInput1ItemsItem3);
    cardSectionSelectionInput1Items.add(cardSectionSelectionInput1ItemsItem4);

    JsonObject cardSectionSelectionInput1 = new JsonObject();
    cardSectionSelectionInput1.add("name", new JsonPrimitive("priority"));
    cardSectionSelectionInput1.add("label", new JsonPrimitive("Priority"));
    cardSectionSelectionInput1.add("type", new JsonPrimitive("DROPDOWN"));
    cardSectionSelectionInput1.add("items", cardSectionSelectionInput1Items);

    JsonObject cardSectionSelectionInput1Widget = new JsonObject();
    cardSectionSelectionInput1Widget.add("selectionInput", cardSectionSelectionInput1);

    JsonObject cardSectionSelectionInput2ItemsItem = new JsonObject();
    cardSectionSelectionInput2ItemsItem.add("text", new JsonPrimitive("Blocks a critical customer operation"));
    cardSectionSelectionInput2ItemsItem.add("value", new JsonPrimitive("Blocks a critical customer operation"));
    
    JsonArray cardSectionSelectionInput2Items = new JsonArray();
    cardSectionSelectionInput2Items.add(cardSectionSelectionInput2ItemsItem);

    JsonObject cardSectionSelectionInput2 = new JsonObject();
    cardSectionSelectionInput2.add("name", new JsonPrimitive("impact"));
    cardSectionSelectionInput2.add("label", new JsonPrimitive("Impact"));
    cardSectionSelectionInput2.add("items", cardSectionSelectionInput2Items);

    JsonObject cardSectionSelectionInput2Widget = new JsonObject();
    cardSectionSelectionInput2Widget.add("selectionInput", cardSectionSelectionInput2);

    JsonObject cardSectionButtonListButtonActionParametersParameter = new JsonObject();
    cardSectionButtonListButtonActionParametersParameter.add("key", new JsonPrimitive("submitCaseCreationForm"));
    cardSectionButtonListButtonActionParametersParameter.add("value", new JsonPrimitive(true));

    JsonArray cardSectionButtonListButtonActionParameters = new JsonArray();
    cardSectionButtonListButtonActionParameters.add(cardSectionButtonListButtonActionParametersParameter);

    JsonObject cardSectionButtonListButtonAction = new JsonObject();
    cardSectionButtonListButtonAction.add("function", new JsonPrimitive(System.getenv().get("URL")));
    cardSectionButtonListButtonAction.add("parameters", cardSectionButtonListButtonActionParameters);
    cardSectionButtonListButtonAction.add("persistValues", new JsonPrimitive(true));

    JsonObject cardSectionButtonListButtonOnCLick = new JsonObject();
    cardSectionButtonListButtonOnCLick.add("action", cardSectionButtonListButtonAction);

    JsonObject cardSectionButtonListButton = new JsonObject();
    cardSectionButtonListButton.add("text", new JsonPrimitive("Create"));
    cardSectionButtonListButton.add("onClick", cardSectionButtonListButtonOnCLick);
    
    JsonArray cardSectionButtonListButtons = new JsonArray();
    cardSectionButtonListButtons.add(cardSectionButtonListButton);

    JsonObject cardSectionButtonList = new JsonObject();
    cardSectionButtonList.add("buttons", cardSectionButtonListButtons);

    JsonObject cardSectionButtonListWidget = new JsonObject();
    cardSectionButtonListWidget.add("buttonList", cardSectionButtonList);

    // Builds the form inputs with error texts for invalid values.
    JsonArray cardSection = new JsonArray();
    if (errors.containsKey("name")) {
      cardSection.add(createErrorTextParagraph(errors.get("name").toString()));
    }
    cardSection.add(cardSectionTextInput1Widget);
    if (errors.containsKey("description")) {
      cardSection.add(createErrorTextParagraph(errors.get("description").toString()));
    }
    cardSection.add(cardSectionTextInput2Widget);
    if (errors.containsKey("priority")) {
      cardSection.add(createErrorTextParagraph(errors.get("priority").toString()));
    }
    cardSection.add(cardSectionSelectionInput1Widget);
    if (errors.containsKey("impact")) {
      cardSection.add(createErrorTextParagraph(errors.get("impact").toString()));
    }

    cardSection.add(cardSectionSelectionInput2Widget);
    cardSection.add(cardSectionButtonListWidget);

    JsonObject cardSectionWidgets = new JsonObject();
    cardSectionWidgets.add("widgets", cardSection);

    JsonArray sections = new JsonArray();
    sections.add(cardSectionWidgets);

    JsonObject card = new JsonObject();
    card.add("header", cardHeader);
    card.add("sections", sections);
    
    JsonObject navigation = new JsonObject();
    if (isUpdate) {
      navigation.add("updateCard", card);
    } else {
      navigation.add("pushCard", card);
    }

    JsonArray navigations = new JsonArray();
    navigations.add(navigation);

    JsonObject action = new JsonObject();
    action.add("navigations", navigations);

    JsonObject renderActions = new JsonObject();
    renderActions.add("action", action);

    if (!isUpdate) {
      return renderActions;
    }

    JsonObject update = new JsonObject();
    update.add("renderActions", renderActions);

    return update;
  }

  // [END add_ons_3p_resources_create_case_card]
  // [START add_ons_3p_resources_submit_create_case]

  /**
   * Submits the creation form. If valid, returns a render action
   * that inserts a new link into the document. If invalid, returns an
   * update card navigation that re-renders the creation form with error messages.
   * 
   * @param event The event object with form input values.
   * @return The resulting response.
   */
  JsonObject submitCaseCreationForm(JsonObject event) throws Exception {
    JsonObject formInputs = event.getAsJsonObject("commonEventObject").getAsJsonObject("formInputs");
    Map<String, String> caseDetails = new HashMap<String, String>();
    if (formInputs != null) {
      if (formInputs.has("name")) {
        caseDetails.put("name", formInputs.getAsJsonObject("name").getAsJsonObject("stringInputs").getAsJsonArray("value").get(0).getAsString());
      }
      if (formInputs.has("description")) {
        caseDetails.put("description", formInputs.getAsJsonObject("description").getAsJsonObject("stringInputs").getAsJsonArray("value").get(0).getAsString());
      }
      if (formInputs.has("priority")) {
        caseDetails.put("priority", formInputs.getAsJsonObject("priority").getAsJsonObject("stringInputs").getAsJsonArray("value").get(0).getAsString());
      }
      if (formInputs.has("impact")) {
        caseDetails.put("impact", formInputs.getAsJsonObject("impact").getAsJsonObject("stringInputs").getAsJsonArray("value").get(0).getAsString());
      }
    }

    Map<String, String> errors = validateFormInputs(caseDetails);
    if (errors.size() > 0) {
      return createCaseInputCard(event, errors, /* isUpdate= */ true);
    } else {
      String title = String.format("Case %s", caseDetails.get("name"));
      // Adds the case details as parameters to the generated link URL.
      URIBuilder uriBuilder = new URIBuilder("https://example.com/support/cases/");
      for (String caseDetailKey : caseDetails.keySet()) {
        uriBuilder.addParameter(caseDetailKey, caseDetails.get(caseDetailKey));
      }
      return createLinkRenderAction(title, uriBuilder.build().toURL().toString());
    }
  }

  // [END add_ons_3p_resources_submit_create_case]
  // [START add_ons_3p_resources_validate_inputs]

  /**
   * Validates case creation form input values.
   * 
   * @param caseDetails The values of each form input submitted by the user.
   * @return A map from field name to error message. An empty object
   *     represents a valid form submission.
   */
  Map<String, String> validateFormInputs(Map<String, String> caseDetails) {
    Map<String, String> errors = new HashMap<String, String>();
    if (!caseDetails.containsKey("name")) {
      errors.put("name", "You must provide a name");
    }
    if (!caseDetails.containsKey("description")) {
      errors.put("description", "You must provide a description");
    }
    if (!caseDetails.containsKey("priority")) {
      errors.put("priority", "You must provide a priority");
    }
    if (caseDetails.containsKey("impact") && !Arrays.asList(new String[]{"P0", "P1"}).contains(caseDetails.get("priority"))) {
      errors.put("impact", "If an issue blocks a critical customer operation, priority must be P0 or P1");
    }
  
    return errors;
  }
  
  /**
   * Returns a text paragraph with red text indicating a form field validation error.
   * 
   * @param errorMessage A description of input value error.
   * @return The resulting text paragraph.
   */
  JsonObject createErrorTextParagraph(String errorMessage) {
    JsonObject textParagraph = new JsonObject();
    textParagraph.add("text", new JsonPrimitive("<font color=\"#BA0300\"><b>Error:</b> " + errorMessage + "</font>"));

    JsonObject textParagraphWidget = new JsonObject();
    textParagraphWidget.add("textParagraph", textParagraph);

    return textParagraphWidget;
  }
  
  // [END add_ons_3p_resources_validate_inputs]
  // [START add_ons_3p_resources_link_render_action]

  /**
   * Returns a submit form response that inserts a link into the document.
   * 
   * @param title The title of the link to insert.
   * @param url The URL of the link to insert.
   * @return The resulting submit form response.
   */
  JsonObject createLinkRenderAction(String title, String url) {
    JsonObject link = new JsonObject();
    link.add("title", new JsonPrimitive(title));
    link.add("url", new JsonPrimitive(url));

    JsonArray links = new JsonArray();
    links.add(link);

    JsonObject action = new JsonObject();
    action.add("links", links);

    JsonObject renderActions = new JsonObject();
    renderActions.add("action", action);

    JsonObject linkRenderAction = new JsonObject();
    linkRenderAction.add("renderActions", renderActions);

    return linkRenderAction;
  }

  // [END add_ons_3p_resources_link_render_action]
}

// [END add_ons_3p_resources]
