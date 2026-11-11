import { defineConfig } from "@wrenjs/core/config";
import preact from "@wrenjs/preact";

export default defineConfig({
	build: {
		inlineCSS: true,
		output: "static",
	},

	integrations: [preact()],
});
