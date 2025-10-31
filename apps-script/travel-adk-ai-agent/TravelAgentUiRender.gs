// Copyright 2025 Google LLC. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

class TravelAgentUiRender extends IAiAgentUiRender {
  ignoredAuthors() {
    return isInDebugMode() ? [] : ["memorize"];
  }

  getAuthorEmoji(author) {
    // Returns an emoji representing the author.
    switch (author) {
      case "inspiration_agent": return "ℹ️";
      case "place_agent": return "📍";
      case "poi_agent": return "🗼";
      case "map_tool": return "🗺️";
      case "planning_agent": return "📅";
      case "memorize": return "🧠";
      default: return "🤖";
    }
  }

  createStatusAccessoryWidgets(text = "In progress...", materialIconName = "progress_activity") {
    // Creates a status accessory widget with a disabled button showing agent progress.
    return [CardService.newButtonSet().addButton(CardService.newTextButton()
      .setText(text)
      .setMaterialIcon(CardService.newMaterialIcon()
        .setName(materialIconName))
      .setOpenLink(CardService.newOpenLink()
        .setUrl("https://google.com"))
      .setDisabled(true))];
  }

  getAgentResponseWidgets(name, response) {
    // Returns the widgets to render for a given agent response.
    let widgets = [];
    switch (name) {
      case "poi_agent": // POISuggestions (with place_name, address, image_url)
        if (this.isChat) {
          widgets = this.createPoiAgentWidgets(response.places);
        }
        break;
      case "place_agent": // DestinationIdeas (with name, country, image)
        if (this.isChat) {
          widgets = this.createPlaceAgentWidgets(response.places);
        }
        break;
      case "map_tool": // POISuggestions (with map_url and place_id)
        if (this.isChat) {
            widgets = this.createMapToolWidgets(response.places);
        }
        break;
      case "google_search_grounding": // Text with URLs
        widgets = this.createGoogleSearchGroundingWidgets(response.result);
        break;
      case "memorize": // Status
        widgets = this.createMemorizeWidgets(response.status);
        break;
      default:
    }
    return widgets;
  }

  // --- Utility functions ---
  
  createTextParagraph(text) {
    const textParagraph = CardService.newTextParagraph();
    if (this.isChat) {
      textParagraph.setText(text);
      // TODO: wait for feature implementation
      // textParagraph.setTextSyntax("MARKDOWN")
    } else {
      textParagraph.setText(markdownToHtml(text));
    }
    return textParagraph;
  }

  createMemorizeWidgets(status) {
    if (!status) return [];
    return [this.createTextParagraph(status)];
  }

  createPlaceAgentWidgets(destinations = []) {
    if (destinations.length === 0) return [];
    const carousel = CardService.newCarousel();
    for (const item of destinations) {
      const carouselCard = CardService.newCarouselCard();
      // Image
      const imageUrl = item.image
      if (imageUrl) {
        carouselCard.addWidget(this.createTextParagraph(isUrlImage(imageUrl) ? imageUrl : NA_IMAGE_URL));
        // TODO: wait for bug fix
        // carouselCard.addWidget(CardService.newImage().setImageUrl(isUrlImage(imageUrl) ? imageUrl : NA_IMAGE_URL));
      }
      // Text
      const destinationName = item.name || "Unknown";
      const country = item.country || "Unknown";
      carouselCard.addWidget(this.createTextParagraph(`**${destinationName}, ${country}**`));
      carousel.addCarouselCard(carouselCard);
    }
    return [carousel];
  }

  createPoiAgentWidgets(places = []) {
    if (places.length === 0) return [];
    const carousel = CardService.newCarousel();
    for (const item of places) {
      const carouselCard = CardService.newCarouselCard();
      // Image
      const imageUrl = item.image_url
      if (imageUrl) {
        carouselCard.addWidget(this.createTextParagraph(isUrlImage(imageUrl) ? imageUrl : NA_IMAGE_URL));
        // TODO: wait for bug fix
        // carouselCard.addWidget(CardService.newImage().setImageUrl(isUrlImage(imageUrl) ? imageUrl : NA_IMAGE_URL));
      }
      // Text
      carouselCard.addWidget(this.createTextParagraph(`**${item.place_name}**`));
      carousel.addCarouselCard(carouselCard);
    }
    return [carousel];
  }
  
  createMapToolWidgets(places = []) {
    // Creates widgets for the map tool agent response (Carousel with map links).
    if (places.length === 0) return [];
    const carousel = CardService.newCarousel();
    for (const item of places) {
      const carouselCard = CardService.newCarouselCard();
      // Text
      const placeName = item.place_name || "";
      carouselCard.addWidget(this.createTextParagraph(`**${placeName}**`));
      // Link
      const address = item.address || "";
      carouselCard.addFooterWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("Open Maps")
          .setOpenLink(CardService.newOpenLink()
            .setUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)},${encodeURIComponent(address)}`))));
      carousel.addCarouselCard(carouselCard);
    }
    return [carousel];
  }

  createGoogleSearchGroundingWidgets(text = "") {
    const urlPattern = /https?:\/\/\S+/g;
    const urls = text.match(urlPattern) || [];
    if (urls.length === 0) return [];
    const sourceButtons = CardService.newButtonSet();
    for (const url of urls) {
      sourceButtons.addButton(CardService.newTextButton()
        .setText(getUrlHostname(url))
        .setOpenLink(CardService.newOpenLink().setUrl(url)));
    }
    return [sourceButtons];
  }
}
