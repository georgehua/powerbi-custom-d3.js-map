module.exports = ( env, options ) => {
	return {
		loaders: [
            { test: /\.json$/, loader: 'json' },
            // other loaders 
         ]

	}
};