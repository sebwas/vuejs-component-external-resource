# Example

The following example show the capability of the external-resources mixin by encapsulating a google maps places suggestion input field that will in the end store the places information in a hidden input in JSON format.

## Usage
In your `main.js` (or whatever you call it), you should import the following file and register it as component to Vue like so:

```javascript
var Vue = require('vue');

import Place from './components/place.vue';

new Vue({
	el: '#app',

	components: {
		Place
	}
});

```

## `components/place.vue`
The methods themselves are inspired by this example from [Google](https://developers.google.com/maps/documentation/javascript/examples/places-autocomplete-addressform). You can find the according documentation [here](https://developers.google.com/maps/documentation/javascript/places-autocomplete).<br />
The HTML Template is based on the great [Semantic UI](http://semantic-ui.com/) CSS Framework.
```html
<template>
	<div class="ui input">
		<input type="hidden" :name="name" v-model="value" />
		<input type="text" @focus="triggerGeoLocation" />
	</div>
</template>

<script>
	import externalResource from './mixins/external-resources';
	import _ from 'lodash';

	export default {
		mixins: [externalResource],

		data() {
			return {
				autocomplete: null,
				value: ''
			};
		},

		props: {
			name: String
		},

		methods: {
			/**
			 * When the address is selected from the suggestion dropdown that
			 * Google provides, we fill in the address into the hidden input
			 * field using the data.value field
			 */
			fillInAddress() {
				////////////////////////////////////////////////////////////////////////////////////
				// The following actions are only examples. See in the documentation (link above) //
				// for a reference on what data is provided and what you can do with it           //
				////////////////////////////////////////////////////////////////////////////////////
				
				var place = _(this.autocomplete.getPlace().address_components)
				// Get the provided component keys
				.mapKeys(v => v.types[0])
				// Map the values to either be short_form or long_form
				.mapValues((v, k) => v[app.config.api.google.maps.components[k]]);

				this.value = JSON.stringify(place.value());
			},

			/**
			 * Tries to set the autocomplete bounds for better accuracy using
			 * the browser's geolocation features
			 */
			triggerGeoLocation() {
				var that = this;

				if (navigator.geolocation) {
					navigator.geolocation.getCurrentPosition((position) => {
						var geolocation = {
							lat: position.coords.latitude,
							lng: position.coords.longitude
						};

						var circle = new google.maps.Circle({
							center: geolocation,
							radius: position.coords.accuracy
						});

						that.autocomplete.setBounds(circle.getBounds());
					});
				}
			}
		},

		external: (e) => {
			e.addStyle('/css/components/input.min.css');
			
			e.addScript(`https://maps.googleapis.com/maps/api/js?key=${app.config.api.google.maps.apiKey}&libraries=places`, {
				// Add the autocomplete functionality to the current item after the
				// Maps API script has been successfully loaded
				success() {
					// Get the text and not the hidden input
					var textInput = this.$el.getElementsByTagName('input')[1];
				
					this.autocomplete = new google.maps.places.Autocomplete(textInput, {types: ['geocode']});
					this.autocomplete.addListener('place_changed', this.fillInAddress);
				}
			});
		}
	}
</script>
```
