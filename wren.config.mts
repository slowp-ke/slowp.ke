import { defineConfig } from "@wren-js/core/config";
import preact from "@wren-js/preact";

export default defineConfig({
	build: {
		inlineCSS: true,
		output: "static",
	},

	integrations: [preact()],
});
