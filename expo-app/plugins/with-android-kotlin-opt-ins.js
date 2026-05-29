const { withProjectBuildGradle } = require("expo/config-plugins");

const kotlinOptIns = `
subprojects {
  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    compilerOptions {
      freeCompilerArgs.add("-opt-in=expo.modules.kotlin.apifeatures.EitherType")
      freeCompilerArgs.add("-opt-in=com.facebook.react.common.annotations.UnstableReactNativeAPI")
    }
  }
}
`;

const marker = "expo.modules.kotlin.apifeatures.EitherType";

module.exports = function withAndroidKotlinOptIns(config) {
  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(marker)) {
      config.modResults.contents = config.modResults.contents.replace(
        "\napply plugin: \"expo-root-project\"",
        `\n${kotlinOptIns}\napply plugin: "expo-root-project"`,
      );
    }

    return config;
  });
};
