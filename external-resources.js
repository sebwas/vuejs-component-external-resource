import _ from 'lodash';

var extRes = (() => {
	// Holds all used items to make sure they are only loaded once
	var register = {};

	// The default options for style and script items
	var defaults = {
		style: {
			media: 'screen',
			type: 'text/css',
			success(fileName) {
				console.info('Loaded file ' + fileName);
			}
		},

		script: {
			type: 'text/javascript',
			success(fileName) {
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
		 * @param {String} fileName
		 */
		add(fileName) {
			fileName = fileName.split('?').shift();

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
		 * @param {String} fileName  The file to be loaded
		 * @param {Object} options   Options to overwrite the default options
		 * @param {String} resolver  Either 'body' or 'head' can be used here. Default: body
		 */
		addScript(fileName, options = {}, resolver = 'body') {
			options = _.merge({}, defaults.script, options);

			methods.addTag.call(this, 'script', fileName, options, resolver);
		},

		/**
		 * Adds the script tag to the HTML document
		 *
		 * @param {String} fileName
		 * @param {Object} options
		 * @param {String} resolver
		 */
		addScriptTag(fileName, options, resolver) {
			var scriptTag = methods.newScriptTag(fileName, options);

			methods.addSuccessCallback(scriptTag, fileName);

			methods['get' + _.capitalize(resolver)]().appendChild(scriptTag);
		},

		/**
		 * Makes sure the register fir the specified file name exists and adds it otherwise.
		 * Also, if it does exist, this throws an exception.
		 *
		 * @param {String} fileName
		 */
		ensureRegisterExists(fileName, options, instance) {
			if (typeof register[fileName] !== "undefined") {
				throw `${fileName} has already been loaded`;
			}

			// == else
			if (typeof register[fileName] === "undefined") {
				register[fileName] = [];
			}
		},

		/**
		 * If the file has already been loaded it will directly execute the callback,
		 * otherwise it will add the callback to the callback stack
		 *
		 * @param {Array} register
		 * @param {Function} callback
		 */
		addCallbackOrExecute(register, callback) {
			if(register === true) {
				callback.call(this);
			} else {
				register.push(callback.bind(this));
			}
		},

		/**
		 * Return a new script tag based on the options and the file name
		 *
		 * @param {String} fileName
		 * @param {Object} options
		 * @return {HTMLElement}
		 */
		newScriptTag(fileName, options) {
			var scriptTag  = document.createElement('script');

			scriptTag.src  = fileName;
			scriptTag.type = options.type;

			return scriptTag;
		},

		/**
		 * Adds the success callback for scripts
		 *
		 * @param {HTMLElement} el
		 * @param {String} fileName
		 */
		addSuccessCallback(el, fileName) {
			el.onload =
			el.onreadystatechange = function() {
				if (register[fileName] !== true &&
						(!this.readyState || this.readyState == "loaded" || this.readyState == "complete")) {
					methods.executeCallbacks(fileName);

					register[fileName] = true;
				}
			};
		},

		/**
		 * Executes all registered callbacks if any
		 *
		 * @param {String} fileName
		 * @param {Vue} instance
		 */
		executeCallbacks(fileName) {
			if(typeof register[fileName] !== "boolean") {
				_.each(register[fileName], x => x(fileName));
			}
		},

		/**
		 * Adds a stylesheet by appending a link tag to the head
		 *
		 * @param {String} fileName
		 * @param {Object} options
		 */
		addStyle(fileName, options = {}) {
			options = _.merge({}, defaults.style, options);

			methods.addTag.call(this, 'style', fileName, options);
		},

		/**
		 * Adds either a style's link tag or a script tag to the document while
		 * making sure that every asset is only loaded once and the success
		 * callback is executed correctly
		 *
		 * @param {String} type     Either 'style' or 'script'
		 * @param {String} fileName
		 * @param {Object} options
		 * @param {String} resolver [optional; only for 'script' type] Either 'head' or 'body'. To determine where the script tag is added
		 */
		addTag(type, fileName, options, resolver) {
			type = _.capitalize(type);

			try {
				methods.ensureRegisterExists(fileName);
				methods[`add${type}Tag`].call(this, fileName, options, resolver);
			} catch(e) {
				if(e.toString().substr(-23) === "has already been loaded") {
					console.info(e);

					return true;
				} else {
					throw e;
				}
			} finally {
				methods.addCallbackOrExecute.call(this, register[fileName], options.success);
			}
		},

		/**
		 * Adds a style link tag to the head using the specified file name and
		 * options and adds the success callback
		 *
		 * @param {String} fileName
		 * @param {Object} options
		 */
		addStyleTag(fileName, options) {
			var styleTag   = document.createElement('link');
			styleTag.rel   = "stylesheet";
			styleTag.href  = fileName;
			styleTag.media = options.media;
			styleTag.type  = options.type;

			methods.addSuccessCallback(styleTag, fileName);

			methods.getHead().appendChild(styleTag);
		},

		/**
		 * Returns the head element
		 *
		 * @return {HTMLElement}
		 */
		getHead() {
			return document.getElementsByTagName('head')[0];
		},

		/**
		 * Returns the body element
		 *
		 * @return {HTMLElement}
		 */
		getBody() {
			return document.getElementsByTagName('body')[0];
		}
	};

	// Only expose the add* functions to the outside
	return {
		bind: (obj) => {
			return {
				add:       methods.add.bind(obj),
				addScript: methods.addScript.bind(obj),
				addStyle:  methods.addStyle.bind(obj),
			};
		}
	};
})();

export default {
	mounted() {
		this.$nextTick(() => {
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
				if((type === "object" || type === "array") && this.$options.external !== null) {
					// The success callback's context when adding a script
					var that = this;

					// We expect an array or an object that we then iterate,
					// executing the proper method of adding on each item
					_.each(this.$options.external, (v, k) => {
						// Case 1:
						// The key references the URL and the value references the type. We
						// pass default values, as well as the Vue component instance (Only
						// relevant for scripts with a callback)
						if (typeof k === "string") {
							v = _.capitalize(v);

							return extRes.bind(that)[`add${v}`](k, {});
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
						return extRes.bind(that).add(v);
					});
				}
			}
		});
	}
}
