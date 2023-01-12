/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     https://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { rollupPluginHTML as html } from '@web/rollup-plugin-html';
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import stripExports from 'rollup-plugin-strip-exports';
import glob from 'glob';

/**
 * Rollup plugin to disable treeshaking entry points.
 * 
 * Used for apps script code in combination with the stripExports
 * plugin. Apps Script doesn't support import/export statement. 
 * While rollup + stripExports correctly removes them, the lack
 * of exported entry points results in an empty bundle. This
 * disables treeshaking on the entry point modules to preserve
 * the bundles.
 * 
 * @return plugin
 */
const disableEntryPointTreeShaking = () => {
    return {
        name: 'no-treeshaking',
        async resolveId(source, importer, options) {
            if (!importer) {
                const resolution = await this.resolve(source, importer, { skipSelf: true, ...options });
                // let's not theeshake entry points, as we're not exporting anything in Apps Script files
                resolution.moduleSideEffects = 'no-treeshake';
                return resolution;
            }
            return null;
        }
    }
}


/**
 * Hook for the rollupHtml plugin to inline bundles in the HTML.
 * Apps Script can not serve raw CSS or JS and any resources
 * in an HTML file either must be inline or served off an external
 * domain.
 * 
 * This allows writing the HTML pages using standard techniques
 * while bundling the HTML in an apps script compatible way for
 * serving.
 * 
 * @param {string} html - HTML content 
 * @param {object} bundle - Bundle info
 * @returns 
 */
function inlineBundles(html, { bundle }) {
    for (const filename of Object.keys(bundle.bundle)) {
        const entry = bundle.bundle[filename];
        if (entry.type === 'chunk') {
            html = replaceScript(html, filename, entry.code);
            delete bundle.bundle[filename]
        } else if (entry.type === 'asset') {
            html = replaceAsset(html, filename, entry.source.toString())
            delete bundle.bundle[filename]
        }
    }
    return html;
}

/**
 * Search/replace script tag w/src and replace with inlined content
 * @param {string} html 
 * @param {string} filename 
 * @param {string} code 
 * @returns {string} Updated HTML
 */
function replaceScript(html, filename, code) {
    const reScript = new RegExp(`<script([^>]*?) src="[./]*${filename}"([^>]*)></script>`);
    return html.replace(reScript, (_, beforeSrc, afterSrc) => `<script${beforeSrc}${afterSrc}>\n${code}\n</script>`);
}

/**
 * Search/replace link tag w/src and replace with inlined CSS style
 * @param {string} html 
 * @param {string} filename 
 * @param {string} code 
 * @returns {string} Updated HTML
 */
 function replaceAsset(html, filename, content) {
    const reCss = new RegExp(`<link[^>]*? href="[./]*${filename}"[^>]*?>`);
    return html.replace(reCss, `<style>\n${content}\n</style>`);
}


/**
 * Creates rollup configs for each HTML entry point.
 * 
 * While rollup supports multiple files for `input`, any
 * scripts or styles shared between them result in additional
 * chunks. Since apps script needs everything inlined, creating
 * isolated entry point configs ensures only bundle/chunk
 * is created.
 * 
 * @param {string} files - glob pattern 
 * @returns {object[]} Array of rollup configs.
 */
function createHtmlBundleConfig(files) {
    const paths = glob.sync(files);
    return paths.map(path => (
        {
            input: path,
            output: {
                dir: 'dist',
            },
            plugins: [
                nodeResolve(),
                commonjs(),
                typescript(),
                html({transformHtml: inlineBundles}),
            ],
        }
    ));
}

// Rollup configs
export default [
    // Client-side bundles
    ...createHtmlBundleConfig('pages/*.html'),
    // Server-side bundles
    {
        input: 'server/index.ts',
        output: {
            dir: 'dist',
            format: 'esm',
        },
        plugins: [
            disableEntryPointTreeShaking(),
            nodeResolve(),
            commonjs(),
            typescript(),
            stripExports(),
        ]
    }
];
