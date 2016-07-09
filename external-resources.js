import {merge, each, capitalize} from 'lodash';

var extRes = (function(){
	// Holds all used items to make sure they are only loaded once
	var register = {};

	// The default options for style and script items
	var defaults = {
		style: {
			media: 'screen',
			type: 'text/css'
		},

		script: {
			type: 'text/javascript',
			success: (fileName) => {
				console.info('Loaded file ' + fileName);
			}
		},
	};

	// Methods used for the external ressources object, partly
	// exposed
	var methods = {
		/**
		 * Tries to automatically determine what type the file in question is and loads it accordingly or
		 * throws an exception if it can't determine that. Uses the default options
		 *
		 * @param {string} fileName
		 */
		add(fileName){
			if (fileName.substr(-4) === '.css') {
				return methods.addStyle(fileName);
			}

			if (fileName.substr(-3) === '.js') {
				return methods.addScript(fileName);
			}

			throw new Exception(`Could not automatically determine what to load: ${fileName}, please use addScript or addStyle explicitly`);
		},

		/**
		 * Adds a script by appending a script tag to the body or the head
		 *
		 * @param {string} fileName  The file to be loaded
		 * @param {object} options   Options to overwrite the default options
		 * @param {string} resolver  Either 'body' or 'head' can be used here. Default: body
		 */
		addScript(fileName, options = {}, resolver = 'body'){
			options = merge(merge({}, defaults.script), options);

			try {
				methods.ensureRegisterExists(fileName);
				methods.addScriptTag(fileName, options, resolver, this);
			} catch(e) {
				if(e.toString().substr(-23) === "has already been loaded"){
					console.info(e);

					return true;
				} else {
					throw e;
				}
			} finally {
				methods.addCallbackOrExecute(register[fileName], options.success, this);
			}
		},

		/**
		 * Adds the script tag to the HTML document
		 *
		 * @param  {string} fileName
		 * @param  {object} options
		 * @param  {string} resolver
		 */
		addScriptTag(fileName, options, resolver, instance){
			var scriptTag = methods.newScriptTag(fileName, options);

			methods.addSuccessCallback(scriptTag, fileName, instance);

			methods['get' + capitalize(resolver)]().appendChild(scriptTag);
		},

		/**
		 * Makes sure the register fir the specified file name exists and adds it otherwise.
		 * Also, if it does exist, this throws an exception.
		 *
		 * @param  {string} fileName
		 */
		ensureRegisterExists(fileName, options, instance){
			if (typeof register[fileName] !== "undefined") {
				throw `${fileName} has already been loaded`;
			}

			if (typeof register[fileName] === "undefined") {
				register[fileName] = [];
			}
		},

		/**
		 * If the file has already been loaded it will directly execute the callback,
		 * otherwise it will add the callback to the callback stack
		 *
		 * @param  {Array} register
		 * @param  {function} callback
		 * @param  {Vue} instance
		 */
		addCallbackOrExecute(register, callback, instance){
			if(register === true){
				callback.call(instance);
			} else {
				register.push(callback);
			}
		},

		/**
		 * Return a new script tag based on the options and the file name
		 *
		 * @param  {string} fileName
		 * @param  {object} options
		 * @return {HTMLElement}
		 */
		newScriptTag(fileName, options){
			var scriptTag  = document.createElement('script');

			scriptTag.src  = fileName;
			scriptTag.type = options.type;

			if (options.async) {
				scriptTag.setAttribute('async', 'async');
			}

			if (options.defer) {
				scriptTag.setAttribute('defer', 'defer');
			}

			return scriptTag;
		},

		/**
		 * Adds the success callback for scripts
		 *
		 * @param  {HTMLElement} scriptTag
		 * @param  {String} fileName
		 */
		addSuccessCallback(scriptTag, fileName, instance){
			scriptTag.onload =
			scriptTag.onreadystatechange = function() {
				if (register[fileName] !== true &&
						(!this.readyState || this.readyState == "loaded" || this.readyState == "complete")) {
					methods.executeCallbacks(fileName, instance);

					register[fileName] = true;
				}
			};
		},

		/**
		 * Executes all registered callbacks if any
		 *
		 * @param  {string} fileName
		 * @param  {Vue} instance
		 */
		executeCallbacks(fileName, instance){
			if(typeof register[fileName] !== "boolean"){
				each(register[fileName], x => x.call(instance, fileName));
			}
		},

		/**
		 * Adds a stylesheet by appending a link tag to the head
		 *
		 * @param {string} fileName
		 * @param {object} options
		 */
		addStyle(fileName, options = {}){
			options = merge(merge({}, defaults.style), options);

			let styleTag   = document.createElement('link');
			styleTag.rel   = "stylesheet";
			styleTag.href  = fileName;
			styleTag.media = options.media;
			styleTag.type  = options.type;

			methods.getHead().appendChild(styleTag);
		},

		/**
		 * Returns the head element
		 *
		 * @return {HTMLElement}
		 */
		getHead(){
			return document.getElementsByTagName('head')[0];
		},

		/**
		 * Returns the body element
		 *
		 * @return {HTMLElement}
		 */
		getBody(){
			return document.getElementsByTagName('body')[0];
		}
	};

	// Only expose the add* functions to the outside
	return {
		add:       methods.add,
		addScript: methods.addScript,
		addStyle:  methods.addStyle,
		bind:      (obj) => {
			return {
				add:       methods.add.bind(obj),
				addScript: methods.addScript.bind(obj),
				addStyle:  methods.addStyle.bind(obj),
			};
		}
	};
})();

export default {
	created() {
		var type = typeof this.$options.external;

		if (type !== "undefined") {
			// Type 1:
			// We have a function as external specification, so we simply
			// execute it in the context of our Vue component, exposing our
			// extRes object
			if (type === "function") {
				return this.$options.external.call(this, extRes.bind(this));
			}

			// Type 2:
			// We have an object or array that wants to be iterated with
			// different cases for each item on how it is treated (see below)
			if((type === "object" || type === "array") && this.$options.external !== null){
				// The success callback's context when adding a script
				var that = this;

				// We expect an array or an object that we then iterate,
				// executing the proper method of adding on each item
				each(this.$options.external, (v, k) => {
					// Case 1:
					// The key references the URL and the value references the type. We
					// pass default values, as well as the Vue component instance (Only
					// relevant for scripts with a callback)
					if (typeof k === "string") {
						v = capitalize(v);

						return extRes[`add${v}`](k, {}, 'body', that);
					}

					// Case 2:
					// The value is a function, so we execute it in the context of our Vue
					// component with the add* functions passed as object
					if (typeof v === "function") {
						return v.call(that, extRes.bind(that));
					}

					// Fallback:
					// If not specified, try to add anyway, guessing the type (File extension
					// based as of now. Think about fetching and intelligently guessing
					// the type by looking at the return value in the future.)
					return extRes.add(v);
				});
			}
		}
	}
}
