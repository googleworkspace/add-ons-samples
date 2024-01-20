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

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.google.cloud.functions.HttpFunction;
import com.google.cloud.functions.HttpRequest;
import com.google.cloud.functions.HttpResponse;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

public class Create3pResources implements HttpFunction {
  private static final Gson gson = new Gson();

  /**
   * Responds to any HTTP request related to link previews.
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
      return;
    } else {
      response.getWriter().write(gson.toJson(createCaseInputCard(event, new HashMap(), false)));
      return;
    }
  }

  // [START add_ons_3p_resources_create_case_card]

  /**
   * Produces a support case creation form.
   * 
   * @param event The event object.
   * @param errors A map of per-field error messages.
   * @param isUpdate Whether to return the form as an updateCard navigation.
   * @return A support case creation form card.
   */
  Map createCaseInputCard(JsonObject event, Map errors, boolean isUpdate) {

    Map cardHeader1 = new HashMap();
    cardHeader1.put("title", "Create a support case");

    Map cardSection1TextInput1 = new HashMap();
    cardSection1TextInput1.put("name", "name");
    cardSection1TextInput1.put("label", "Name");

    Map cardSection1TextInput1Widget = new HashMap();
    cardSection1TextInput1Widget.put("textInput", cardSection1TextInput1);

    Map cardSection1TextInput2 = new HashMap();
    cardSection1TextInput2.put("name", "description");
    cardSection1TextInput2.put("label", "Description");
    cardSection1TextInput2.put("type", "MULTIPLE_LINE");

    Map cardSection1TextInput2Widget = new HashMap();
    cardSection1TextInput2Widget.put("textInput", cardSection1TextInput2);

    Map cardSection1SelectionInput1ItemsItem1 = new HashMap();
    cardSection1SelectionInput1ItemsItem1.put("text", "P0");
    cardSection1SelectionInput1ItemsItem1.put("value", "P0");

    Map cardSection1SelectionInput1ItemsItem2 = new HashMap();
    cardSection1SelectionInput1ItemsItem2.put("text", "P1");
    cardSection1SelectionInput1ItemsItem2.put("value", "P1");

    Map cardSection1SelectionInput1ItemsItem3 = new HashMap();
    cardSection1SelectionInput1ItemsItem3.put("text", "P2");
    cardSection1SelectionInput1ItemsItem3.put("value", "P2");

    Map cardSection1SelectionInput1ItemsItem4 = new HashMap();
    cardSection1SelectionInput1ItemsItem4.put("text", "P3");
    cardSection1SelectionInput1ItemsItem4.put("value", "P3");

    List cardSection1SelectionInput1Items = new ArrayList();
    cardSection1SelectionInput1Items.add(cardSection1SelectionInput1ItemsItem1);
    cardSection1SelectionInput1Items.add(cardSection1SelectionInput1ItemsItem2);
    cardSection1SelectionInput1Items.add(cardSection1SelectionInput1ItemsItem3);
    cardSection1SelectionInput1Items.add(cardSection1SelectionInput1ItemsItem4);

    Map cardSection1SelectionInput1 = new HashMap();
    cardSection1SelectionInput1.put("name", "priority");
    cardSection1SelectionInput1.put("label", "Priority");
    cardSection1SelectionInput1.put("type", "DROPDOWN");
    cardSection1SelectionInput1.put("items", cardSection1SelectionInput1Items);

    Map cardSection1SelectionInput1Widget = new HashMap();
    cardSection1SelectionInput1Widget.put("selectionInput", cardSection1SelectionInput1);

    Map cardSection1SelectionInput2ItemsItem1 = new HashMap();
    cardSection1SelectionInput2ItemsItem1.put("text", "Blocks a critical customer operation");
    cardSection1SelectionInput2ItemsItem1.put("value", "Blocks a critical customer operation");

    List cardSection1SelectionInput2Items = new ArrayList();
    cardSection1SelectionInput2Items.add(cardSection1SelectionInput2ItemsItem1);

    Map cardSection1SelectionInput2 = new HashMap();
    cardSection1SelectionInput2.put("name", "impact");
    cardSection1SelectionInput2.put("label", "Impact");
    cardSection1SelectionInput2.put("items", cardSection1SelectionInput2Items);

    Map cardSection1SelectionInput2Widget = new HashMap();
    cardSection1SelectionInput2Widget.put("selectionInput", cardSection1SelectionInput2);

    Map cardSection1ButtonList1Button1Action1ParametersParameter1 = new HashMap();
    cardSection1ButtonList1Button1Action1ParametersParameter1.put("key", "submitCaseCreationForm");
    cardSection1ButtonList1Button1Action1ParametersParameter1.put("value", true);

    List cardSection1ButtonList1Button1Action1Parameters = new ArrayList();
    cardSection1ButtonList1Button1Action1Parameters.add(cardSection1ButtonList1Button1Action1ParametersParameter1);

    Map cardSection1ButtonList1Button1Action1 = new HashMap();
    cardSection1ButtonList1Button1Action1.put("function", System.getenv().get("URL"));
    cardSection1ButtonList1Button1Action1.put("parameters", cardSection1ButtonList1Button1Action1Parameters);
    cardSection1ButtonList1Button1Action1.put("persistValues", true);

    Map cardSection1ButtonList1Button1OnCLick = new HashMap();
    cardSection1ButtonList1Button1OnCLick.put("action", cardSection1ButtonList1Button1Action1);

    Map cardSection1ButtonList1Button1 = new HashMap();
    cardSection1ButtonList1Button1.put("text", "Create");
    cardSection1ButtonList1Button1.put("onClick", cardSection1ButtonList1Button1OnCLick);
    
    List cardSection1ButtonList1Buttons = new ArrayList();
    cardSection1ButtonList1Buttons.add(cardSection1ButtonList1Button1);

    Map cardSection1ButtonList1 = new HashMap();
    cardSection1ButtonList1.put("buttons", cardSection1ButtonList1Buttons);

    Map cardSection1ButtonList1Widget = new HashMap();
    cardSection1ButtonList1Widget.put("buttonList", cardSection1ButtonList1);

    // Builds the creation form and adds error text for invalid inputs.
    List cardSection1 = new ArrayList();
    if (errors.containsKey("name")) {
      cardSection1.add(createErrorTextParagraph(errors.get("name").toString()));
    }
    cardSection1.add(cardSection1TextInput1Widget);
    if (errors.containsKey("description")) {
      cardSection1.add(createErrorTextParagraph(errors.get("description").toString()));
    }
    cardSection1.add(cardSection1TextInput2Widget);
    if (errors.containsKey("priority")) {
      cardSection1.add(createErrorTextParagraph(errors.get("priority").toString()));
    }
    cardSection1.add(cardSection1SelectionInput1Widget);
    if (errors.containsKey("impact")) {
      cardSection1.add(createErrorTextParagraph(errors.get("impact").toString()));
    }

    cardSection1.add(cardSection1SelectionInput2Widget);
    cardSection1.add(cardSection1ButtonList1Widget);

    Map cardSection1Widgets = new HashMap();
    cardSection1Widgets.put("widgets", cardSection1);

    List sections = new ArrayList();
    sections.add(cardSection1Widgets);

    Map card = new HashMap();
    card.put("header", cardHeader1);
    card.put("sections", sections);
    
    Map navigation = new HashMap();
    if (isUpdate) {
      navigation.put("updateCard", card);
    } else {
      navigation.put("pushCard", card);
    }

    List navigations = new ArrayList();
    navigations.add(navigation);

    Map action = new HashMap();
    action.put("navigations", navigations);

    Map renderActions = new HashMap();
    renderActions.put("action", action);

    if (!isUpdate) {
      return renderActions;
    }

    Map update = new HashMap();
    update.put("renderActions", renderActions);

    return update;
  }

  // [END add_ons_3p_resources_create_case_card]
  // [START add_ons_3p_resources_submit_create_case]

  /**
   * Called when the creation form is submitted. If form input is valid, returns a render action
   * that inserts a new link into the document. If invalid, returns an updateCard navigation that
   * re-renders the creation form with error messages.
   * 
   * @param event The event object containing form inputs.
   * @return The navigation action.
   */
  Map submitCaseCreationForm(JsonObject event) throws UnsupportedEncodingException{
    JsonObject formInputs = event.getAsJsonObject("commonEventObject").getAsJsonObject("formInputs");
    Map caseDetails = new HashMap();
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

    Map errors = validateFormInputs(caseDetails);
    if (errors.size() > 0) {
      return createCaseInputCard(event, errors, /* isUpdate= */ true);
    } else {
      String title = String.format("Case %s", caseDetails.get("name"));
      String url = "https://example.com/support/cases/" + URLEncoder.encode(gson.toJson(caseDetails), "UTF-8").replaceAll("\\+", "%20").replaceAll("\\%21", "!").replaceAll("\\%27", "'").replaceAll("\\%28", "(").replaceAll("\\%29", ")").replaceAll("\\%7E", "~");
      return createLinkRenderAction(title, url);
    }
  }

  // [END add_ons_3p_resources_submit_create_case]
  // [START add_ons_3p_resources_validate_inputs]

  /**
   * Validates form inputs for case creation.
   * 
   * @param caseDetails The values of each form input submitted by the user.
   * @return A map from field name to error message. An empty object
   *     represents a valid form submission.
   */
  Map validateFormInputs(Map caseDetails) {
    Map errors = new HashMap();
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
   * Returns a TextParagraph with red text indicating a form field validation error.
   * 
   * @param errorMessage A description of the invalid input.
   * @return A text paragraph.
   */
  Map createErrorTextParagraph(String errorMessage) {
    Map textParagraph = new HashMap();
    textParagraph.put("text", "<font color=\"#BA0300\"><b>Error:</b> " + errorMessage + "</font>");

    Map textParagraphWidget = new HashMap();
    textParagraphWidget.put("textParagraph", textParagraph);

    return textParagraphWidget;
  }
  
  // [END add_ons_3p_resources_validate_inputs]
  // [START add_ons_3p_resources_link_render_action]

  /**
   * Returns a render action that inserts a link into the document.
   * @param title The title of the link to insert.
   * @param url The URL of the link to insert.
   * @return The render action
   */
  Map createLinkRenderAction(String title, String url) {
    Map link1 = new HashMap();
    link1.put("title", title);
    link1.put("url", url);

    List links = new ArrayList();
    links.add(link1);

    Map action = new HashMap();
    action.put("links", links);

    Map renderActions = new HashMap();
    renderActions.put("action", action);

    Map linkRenderAction = new HashMap();
    linkRenderAction.put("renderActions", renderActions);

    return linkRenderAction;
  }

  // [END add_ons_3p_resources_link_render_action]
}

// [END add_ons_3p_resources]
