"use strict";

const crypto = require("node:crypto");
const path = require("node:path");
const t = require("@babel/types");

const DEFAULT_SUPPORTED_COMPONENTS = [
  "View",
  "Text",
  "Pressable",
  "TouchableOpacity",
  "Image",
  "TextInput",
  "ScrollView"
];

const REACT_NATIVE_IMPORT = "react-native";
const DEFAULT_RUNTIME_IMPORT = "@agentlens/react-native/runtime";
const DEFAULT_TEST_ID_PREFIX = "agentlens";

function agentLensBabelPlugin(api) {
  api.assertVersion(7);

  const babelEnv = api.env();

  return {
    name: "agentlens-babel-plugin",

    pre() {
      this.agentLens = {
        didInstrument: false,
        helperId: null,
        importedComponents: new Map(),
        reactNativeNamespaces: new Set()
      };
    },

    visitor: {
      Program: {
        enter(programPath, state) {
          state.agentLens.helperId = programPath.scope.generateUidIdentifier(
            "agentLensCreateRef"
          );
        },

        exit(programPath, state) {
          if (!state.agentLens.didInstrument || !state.agentLens.helperId) {
            return;
          }

          programPath.unshiftContainer(
            "body",
            t.importDeclaration(
              [
                t.importSpecifier(
                  t.cloneNode(state.agentLens.helperId),
                  t.identifier("__agentLensCreateRef")
                )
              ],
              t.stringLiteral(state.opts.importSource || DEFAULT_RUNTIME_IMPORT)
            )
          );
          // Module transforms need the binding for this late-inserted import.
          programPath.scope.crawl();
        }
      },

      ImportDeclaration(importPath, state) {
        if (importPath.node.source.value !== REACT_NATIVE_IMPORT) {
          return;
        }

        const supportedComponents = getSupportedComponents(state.opts);

        for (const specifier of importPath.node.specifiers) {
          if (t.isImportSpecifier(specifier)) {
            const importedName = getImportSpecifierName(specifier.imported);

            if (supportedComponents.has(importedName)) {
              state.agentLens.importedComponents.set(
                specifier.local.name,
                importedName
              );
            }
          }

          if (t.isImportNamespaceSpecifier(specifier)) {
            state.agentLens.reactNativeNamespaces.add(specifier.local.name);
          }
        }
      },

      JSXOpeningElement(openingPath, state) {
        if (!isInstrumentationEnabled(state.opts, babelEnv)) {
          return;
        }

        if (shouldSkipFile(state)) {
          return;
        }

        if (!state.agentLens.helperId) {
          return;
        }

        const component = getInspectableComponentName(openingPath, state);

        if (!component) {
          return;
        }

        const loc = openingPath.node.loc && openingPath.node.loc.start;

        if (!loc) {
          return;
        }

        const sourceFile = getSourceFile(state);
        const column = loc.column + 1;
        const id = createElementId({
          component,
          file: sourceFile,
          line: loc.line,
          column
        });

        const refAttribute = findJSXAttribute(openingPath.node, "ref");
        const originalRefExpression = getRefExpression(
          refAttribute && refAttribute.attribute
        );

        if (refAttribute && !originalRefExpression) {
          return;
        }

        const refValue = t.jsxExpressionContainer(
          t.callExpression(t.cloneNode(state.agentLens.helperId), [
            createMetadataObject({
              id,
              component,
              file: sourceFile,
              line: loc.line,
              column
            }),
            ...(originalRefExpression ? [t.cloneNode(originalRefExpression)] : [])
          ])
        );

        if (refAttribute) {
          refAttribute.attribute.value = refValue;
        } else {
          openingPath.node.attributes.push(
            t.jsxAttribute(t.jsxIdentifier("ref"), refValue)
          );
        }

        if (state.opts.includeTestID !== false) {
          addTestIDIfMissing(openingPath.node, id, state.opts);
        }

        if (component === "View") {
          addCollapsableFalseIfMissing(openingPath.node);
        }

        state.agentLens.didInstrument = true;
      }
    }
  };
}

function getSupportedComponents(options) {
  return new Set(options.supportedComponents || DEFAULT_SUPPORTED_COMPONENTS);
}

function isInstrumentationEnabled(options, babelEnv) {
  if (typeof options.enabled === "boolean") {
    return options.enabled;
  }

  const env = babelEnv || process.env.BABEL_ENV || process.env.NODE_ENV;
  return env !== "production";
}

function getImportSpecifierName(imported) {
  return t.isIdentifier(imported) ? imported.name : imported.value;
}

function getInspectableComponentName(openingPath, state) {
  const name = openingPath.node.name;
  const supportedComponents = getSupportedComponents(state.opts);

  if (t.isJSXIdentifier(name)) {
    const importedComponent = state.agentLens.importedComponents.get(name.name);

    if (importedComponent) {
      return importedComponent;
    }

    if (
      state.opts.instrumentUnimportedReactNativeNames &&
      supportedComponents.has(name.name)
    ) {
      return name.name;
    }

    return null;
  }

  if (
    t.isJSXMemberExpression(name) &&
    t.isJSXIdentifier(name.object) &&
    t.isJSXIdentifier(name.property) &&
    state.agentLens.reactNativeNamespaces.has(name.object.name) &&
    supportedComponents.has(name.property.name)
  ) {
    return name.property.name;
  }

  return null;
}

function getSourceFile(state) {
  const filename = state.file.opts.filename;

  if (!filename) {
    return "unknown";
  }

  const rootDir = state.opts.rootDir || process.cwd();
  return path.relative(rootDir, filename).replace(/\\/g, "/");
}

function shouldSkipFile(state) {
  const filename = state.file.opts.filename;

  if (!filename) {
    return false;
  }

  const normalizedFilename = filename.replace(/\\/g, "/");

  if (
    normalizedFilename.includes("/node_modules/@agentlens/react-native/") ||
    normalizedFilename.includes("/packages/react-native/src/")
  ) {
    return true;
  }

  return Boolean(
    state.opts.ignore &&
      state.opts.ignore.some((ignoredPath) =>
        normalizedFilename.includes(ignoredPath.replace(/\\/g, "/"))
      )
  );
}

function createElementId(input) {
  const hash = crypto
    .createHash("sha1")
    .update(`${input.file}:${input.line}:${input.column}:${input.component}`)
    .digest("hex")
    .slice(0, 12);

  return `${DEFAULT_TEST_ID_PREFIX}-${hash}`;
}

function createMetadataObject(input) {
  return t.objectExpression([
    t.objectProperty(t.identifier("id"), t.stringLiteral(input.id)),
    t.objectProperty(t.identifier("component"), t.stringLiteral(input.component)),
    t.objectProperty(
      t.identifier("source"),
      t.objectExpression([
        t.objectProperty(t.identifier("file"), t.stringLiteral(input.file)),
        t.objectProperty(t.identifier("line"), t.numericLiteral(input.line)),
        t.objectProperty(t.identifier("column"), t.numericLiteral(input.column))
      ])
    )
  ]);
}

function findJSXAttribute(openingElement, name) {
  const index = openingElement.attributes.findIndex(
    (attribute) =>
      t.isJSXAttribute(attribute) &&
      t.isJSXIdentifier(attribute.name) &&
      attribute.name.name === name
  );

  if (index === -1) {
    return null;
  }

  return {
    attribute: openingElement.attributes[index],
    index
  };
}

function getRefExpression(attribute) {
  if (!attribute) {
    return null;
  }

  if (
    t.isJSXExpressionContainer(attribute.value) &&
    t.isExpression(attribute.value.expression)
  ) {
    return attribute.value.expression;
  }

  return null;
}

function addTestIDIfMissing(openingElement, id, options) {
  if (findJSXAttribute(openingElement, "testID")) {
    return;
  }

  openingElement.attributes.push(
    t.jsxAttribute(
      t.jsxIdentifier("testID"),
      t.stringLiteral(`${options.testIDPrefix || DEFAULT_TEST_ID_PREFIX}:${id}`)
    )
  );
}

function addCollapsableFalseIfMissing(openingElement) {
  if (findJSXAttribute(openingElement, "collapsable")) {
    return;
  }

  openingElement.attributes.push(
    t.jsxAttribute(
      t.jsxIdentifier("collapsable"),
      t.jsxExpressionContainer(t.booleanLiteral(false))
    )
  );
}

module.exports = agentLensBabelPlugin;
module.exports.default = agentLensBabelPlugin;
