# Initialize the static-mcpify project

This project is a combination of two things:

- A node based cli tool that pulls content from a Contentful space and builds local files
- A node based utility that exposes those local files as an MCP server

## Basics

- Use npm for dependency management
- Use Zod for type definitions and for validation wherever possible, throwing errors when types do not match expectations.
- You need to keep the README.md file updated with information on how to use this project to build contentful based mcp servers
- Use TypeScript everywhere

## The `smcp` cli

The `smcp` is the terminal command.

`smcp` has robust and descriptive error handling in all scenarios so that the user can easily fix issues.

`smcp` expects there to be a `CONTENTFUL_API_TOKEN` and a `SPACE_ID` environment variables

```sh
CONTENTFUL_API_TOKEN=nP...mo
SPACE_ID=1x...mb
```

### `smcp init --output example`: This command will

- Create the `<output>/config.json` file (which is described below)
- Create the `<output>/content/entries` folder
- Create the `<output>/content/assets` folder
- Ask the user for what `<content-type>` they want, and which tools for each, and which fields for each tool.
- Create the `<output>/content/entries/<content-type>/config.json` files based on the user responses.

### `smcp build --output example` should do the following:

- Look at the folder names at the `<output>/content/entries/<content-type>` path.
- Look at the folder `<output>/config.json` file. I will refer to the contents of this file as `outputConfig`
    - `outputConfig.source` will contain a `source` property which is a nullable enum. Current accepted value is only `contentful`
    - If source is nullable, throw an error saying "source is required to run the build".
- The `<content-type>` must be the name of a contentful content type.
- Read the `<output>/content/entries/config.json` file. I will refer to the contents of this file as `contentConfig`.
- For each `<output>/content/entries/<content-type>` folder
    - Read the `<output>/content/entries/<content-type>/config.json` file. I will refer to the contents of this file as `entryConfig`
    - The `entryConfig.tools` array of objects will define a list of entry-specific tools.
    - The `entryConfig.tools[].name` property will contain the tool name. I will refer to this as `<tool-name>`
    - If `entryConfig.tools[].name` equals `abc` then a tool `get_<content-type>_abc` would be defined.
    - The `entryConfig.tools[].fields` property will contain the fields to look at.
    - For each `<tool-name>`
        - Convert the title of the entity into snake case. I will refer to that as `<entity-title>`
        - Pull each entry of this content type and build a `<output>/content/entries/<content-type>/<entity-title>/tools/<tool-name>.md`
        - This file should contain all of the fields in the `entryConfig.tools[].fields`, converted to markdown.
    - For each asset referenced in any of the fields, add that asset to `content/assets/<asset-file-name>.png`
    - Add the entire asset json including all fields except the rich text fields, to a `<output>/content/entries/<content-type>/<entity-title>/data.json` file.

`smcp build --dest example --content-type abc --content-type xyz` would only build for the `abc` and `xyz` content types

Write and organize the code in a way that other `--source` options could become available in the future, pulling content from other sources. The structure of the files under `content` would remain the same regardless of the source.

## The `static-mcpify` server

The contentfully mcpify server should expose a function that can be given incoming request properties such
as the method, body, etc. and returns a response object including status, body, etc.
In this way any web server could use this function to expose an mcp server
The server should dynamically define tools based on the the contents of the `content` folder
The server should be built as a streamable http mcp server

### Tools

- `list_assets`
- `get_asset`
- For each `<content-type>`
    - `list_<content-type>`
    - `get_<content-type>`
    - For each `<tool-name>` for that content type
        - `get_<content-type>_<tool-name>`

All `list_` tools
- can be filtered on substring match of title (or file name for assets)
- Return the list of titles (or file name for assets)

All `get_<content-type>` tools
- Accept the entry title as input (or file name for assets)
- Return the contents of `<output>/content/entries/<content-type>/<entity-title>/data.json`

All `get_<content-type>_<tool-name>` tools
- Accept the entry title as input (or file name for assets)
- Return the contents of `<output>/content/entries/<content-type>/<entity-title>/tools/<tool-name>.md`

## Example usage

This code base itself should have an `examples/static` folder with some static built content so that it is easy to see what the results should look like.

- `examples/static/content/entries/person/bob-smith/tools/biography.md`
- `examples/static/content/entries/person/bob-smith/tools/skills.md`
- `examples/static/content/entries/person/bob-smith/data.json`
- `examples/static/content/entries/person/steve-baker/tools/biography.md`
- `examples/static/content/entries/person/steve-baker/tools/skills.md`
- `examples/static/content/entries/person/steve-baker/data.json`
- `examples/static/content/entries/place/work-site/tools/description.md`
- `examples/static/content/entries/place/work-site/data.json`
- `examples/static/content/entries/place/the-big-mountain/tools/description.md`
- `examples/static/content/entries/place/the-big-mountain/data.json`

The code base should also have an example `examples/contentful` folder.

- `<content-type>`: `adventure` and `campaign`
- Tools: `description` which users the field named `description`
- When you need auth information with contentful, ask my to update the `.env` file

## Deployment

- Read up on https://docs.netlify.com/build/functions/overview/

Setup this project to deploy the static mcp to a `/example/static/mcp` url and the contentful example mcp to a `/example/contentful/mcp`.

## Branding

Create a super slick brand website under `/brand`

This website should explain how to use this `static-mcpify` project to build and deploy static mcp servers.

It should start with talking about the general capabilities that could be used for any content source (as long as the resulting files look correct) and could be deployed to any server backend.

It should then talk concretly about how to use Contentful as a content source for the MCP server.

It should then talk concretely about how to deploy this mcp to Netlify.

It should use a dark css theme and should be super awesome looking.

## Local Development and Testing

`npm start` should start both local mcp servers (static and contentful examples) along with the brand website
`npm build` should run the needed `smcp` commands to build the contentful example website
`npm test` should perform a quick sanity check that the streamable http endpoints of both mcp servers are working and that the locally running brand website is running correctly
`npm fix` should run linting and auto fixing

Make sure the needed files are excluded from git

## Agentic Coding

Read this information:
- https://code.visualstudio.com/docs/copilot/overview
- https://code.visualstudio.com/docs/copilot/customization/custom-agents
- https://code.visualstudio.com/docs/copilot/customization/prompt-files
- https://code.visualstudio.com/docs/copilot/customization/agent-skills
- https://code.visualstudio.com/docs/copilot/customization/custom-instructions

Then produce content under `.github/` as needed so that as a developer I can easily work within this repository and make use of VSCode Copilot.
Make sure there is a `/commit` Copilot prompt that checks the builds and linting. If the build and linting runs without issue then this prompt will commit the changes, only asking for confirmation if there is something in the code that looks like it needs human input before committing.

## Code base structure

- `.github/prompts/`
- `.github/skills/`
- `.github/copilot-instructions.md`
- `src/cli/` - cli code
- `src/cli/sources/contentful/`
- `src/server/` - server code
- `src/types/` - shared types between other parts of the code base
- `brand/`
- `netlify/`
- `test`
- etc.

## Final thoughts before you start working

- Work long and hard, doing a great job, completing every task
- Work autonymously, committing when you have a major milestone
- Check for build and lint errors along the way and before making commits
- Keep the README.md up to date
