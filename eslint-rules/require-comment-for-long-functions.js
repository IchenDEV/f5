function getFunctionLineCount(node) {
  return node.loc.end.line - node.loc.start.line + 1;
}

function hasLeadingComment(sourceCode, node) {
  if (sourceCode.getCommentsBefore(node).length > 0) return true;
  if (node.parent?.type === 'MethodDefinition') {
    return sourceCode.getCommentsBefore(node.parent).length > 0;
  }
  return false;
}

function reportIfLongAndUncommented(context, node, maxLines) {
  const sourceCode = context.sourceCode;

  if (getFunctionLineCount(node) <= maxLines || hasLeadingComment(sourceCode, node)) {
    return;
  }

  context.report({
    node,
    message: `Functions longer than ${maxLines} lines must have a leading comment.`,
  });
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require a leading comment for functions over a configured line count.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxLines: {
            type: 'number',
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {},
  },
  create(context) {
    const [{ maxLines = 40 } = {}] = context.options;

    return {
      FunctionDeclaration(node) {
        reportIfLongAndUncommented(context, node, maxLines);
      },
      FunctionExpression(node) {
        reportIfLongAndUncommented(context, node, maxLines);
      },
      ArrowFunctionExpression(node) {
        reportIfLongAndUncommented(context, node, maxLines);
      },
    };
  },
};
