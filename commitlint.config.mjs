export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'header-max-length': [2, 'always', 120],
        'body-max-line-length': [1, 'always', 100],
    },
    /*
     * Release commits often exceed the max. length because of the appended
     * changelog, so skip commits that don't contribute to a release.
     */
    ignores: [
        (commit) =>
            commit.includes('[skip release]') || commit.includes('[skip ci]'),
    ],
}
