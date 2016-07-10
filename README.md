# VueJS external resource loader (script and style) for components
Using this you can easily load script and style dependencies that you can easily define in your component.

I use [ES2015](https://babeljs.io/docs/learn-es2015/) features, so for maximum compatibility I would recommend using [babel](https://babeljs.io/) to compile it to Javascript that is better understood in older browsers.

Whenever you use the callback option (either as the external value directly or in the array form) the Vue instance is bound to it. Also, for the success callback on scripts, the Vue instance is bound to it, so that you can fully access all of its properties.

## Dependencies
The loader needs `merge`, `each` and `capitalize` from [lodash/lodash](https://github.com/lodash/lodash).

## Example
The external-resources.js file is intended to be used as a mixin.

Example:
```javascript
import externalResources from './mixins/external-resources';

Vue.component('example-tag', {
	mixins: [externalResources],
	template: '#example-template',
	external: [
		'https://cdnjs.cloudflare.com/ajax/libs/960gs/0/960.min.css',
		(l) => l.addScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.1.6/Chart.min.js', {
			success: (fileName) => {
				window.alert(fileName);
			}
		});
	]
});
```

## Usage
In general there are 3 different ways to specify the items you want to be loaded:

### As a function
Using `external` as a function and use the loader API directly. It offers three functions: `add`, `addScript` and `addStyle`, where the first one is set up to guess based on the specified extension or throw an exception.
```javascript
{
	// ...
	external(loader) {
		loader.add('https://cdnjs.cloudflare.com/ajax/libs/Hyphenator/5.0.1/Hyphenator.min.js'); // Automatically guess, or get an exception
		loader.addScript('https://cdnjs.cloudflare.com/ajax/libs/SoundJS/0.6.0/soundjs.min.js', {
			success: (fileName) => {
				console.log('Loaded ' + fileName);
			}
		}, 'head');
		loader.addStyle('https://cdnjs.cloudflare.com/ajax/libs/balloon-css/0.3.0/balloon.min.css');
	}
	// ...
}
```

### As an object
Using `external` as an object with a `asset: type` structure:
```javascript
{
	// ...
	external: {
		'https://cdnjs.cloudflare.com/ajax/libs/ckeditor/4.5.9/ckeditor.js': 'script',
		'https://cdnjs.cloudflare.com/ajax/libs/colors/1.0/colors.min.css': 'style'
	}
	// ...
}
```

### As an array
Using `external` as an array. Here you have two possibilities: specify the resource as a simple string or use a function that gets the loader as a parameter.
```javascript
{
	// ...
	external: [
		'https://cdnjs.cloudflare.com/ajax/libs/d3/4.1.0/d3.min.js',
		(l) => l.addStyle('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.6.3/css/font-awesome.min.css')
	]
	// ...
}
```
