Update the static-mcpify server as described:

- Update the list_assets tool to refer to the `.json` files under the `content/assets` directory
- Update the get_asset tool to take in the name, such as `test-image` and return the contents of `content/assets/<name>.json`
    - I will refer to this json as `assetJson`
    - A `url` property should be added to the contents of this json
    - A `BASE_URL` env variable should be used
    - The value of the `url` property should be `${BASE_URL}/${assetJson.file}`
- Update the local development environment to set `BASE_URL` correct.
- For the Netlify deployment, I will add the `BASE_URL` env var to the function
- I have added an example at `examples/static/content/assets/test-image.json` and `netlify/brand/test-image.jpeg`
- Update the `netlify/brand/index.html` and `README.md` as needed based on these changes.
- Test the changes on localhost
