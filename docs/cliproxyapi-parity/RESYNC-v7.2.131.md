<!-- vale off -->

# Resync register: v7.2.121 to v7.2.131

Upstream moved from `8392b180` (v7.2.121) to `d757063c` (v7.2.131): 76 commits.
Test inventory moved `internal` 2,926 to 3,125 and `sdk` 943 to 1,002.
Reconciled here: **264 new rows**, against **6 rows that left upstream**.

The pin in a document header moves only once that document is reconciled, so a stale
header is the truth about that document rather than an oversight.

## Rows that left upstream

The last two are renames rather than removals. Each gained a `Namespace` segment and now
asserts the namespace on the restored custom tool call, so both arrive again in the new list.

- `TestAntigravityRequestHasMatchingFunctionResponseWhitespaceCallID`
- `TestConvertClaudeResponseToOpenAIResponses_RestoresAdditionalCustomToolCall`
- `TestConvertClaudeResponseToOpenAIResponsesNonStream_RestoresAdditionalCustomToolCall`
- `TestForwardResponsesStreamExposesOnlyClientErrors`
- `TestStreamingTool_MixedSuppressedAndValid`
- `TestStreamingTool_StopReasonMixedSuppressedAndValid`

## New rows by family

| Family                                              | Rows | Document                                                      | Reconciled |
| --------------------------------------------------- | ---: | ------------------------------------------------------------- | ---------- |
| `internal/runtime/executor`                         |   87 | `runtime-executor.md` and the per-provider executor documents | no         |
| `sdk/api/handlers/openai`                           |   40 | `api.md`                                                      | no         |
| `internal/runtime/executor/helps`                   |   29 | `runtime-executor.md`                                         | no         |
| `internal/translator/openai/openai/responses`       |   16 | the matching `translator-*.md`                                | no         |
| `internal/signature`                                |   16 | `signature.md`                                                | yes        |
| `internal/client/codex/live`                        |   16 | `client.md`                                                   | no         |
| `sdk/api/handlers`                                  |   10 | `api.md`                                                      | no         |
| `internal/translator/openai/claude`                 |    8 | the matching `translator-*.md`                                | no         |
| `sdk/cliproxy/auth`                                 |    5 | `auth.md`                                                     | no         |
| `internal/util`                                     |    5 | `util.md`                                                     | yes        |
| `sdk/cliproxy`                                      |    4 | `store.md`                                                    | no         |
| `internal/pluginhost`                               |    4 | `small-packages.md`                                           | no         |
| `internal/api`                                      |    4 | `api.md`                                                      | no         |
| `internal/api/handlers/management`                  |    3 | `api.md`                                                      | no         |
| `internal/watcher/synthesizer`                      |    2 | `watcher.md`                                                  | no         |
| `internal/translator/claude/openai/responses`       |    2 | the matching `translator-*.md`                                | no         |
| `internal/cache`                                    |    2 | `cache.md`                                                    | yes        |
| `sdk/translator`                                    |    1 | `translator-common.md`                                        | no         |
| `internal/translator/openai/gemini`                 |    1 | `translator-openai.md`                                        | yes        |
| `internal/translator/gemini/gemini`                 |    1 | `translator-gemini.md`                                        | yes        |
| `internal/translator/common`                        |    1 | the matching `translator-*.md`                                | no         |
| `internal/translator/codex/openai/chat-completions` |    1 | the matching `translator-*.md`                                | no         |
| `internal/translator/codex/gemini`                  |    1 | `translator-codex.md`                                         | yes        |
| `internal/translator/claude/gemini`                 |    1 | `translator-claude.md`                                        | yes        |
| `internal/translator/antigravity/gemini`            |    1 | `translator-antigravity.md`                                   | yes        |
| `internal/registry`                                 |    1 | `registry.md`                                                 | yes        |
| `internal/config`                                   |    1 | `config.md`                                                   | no         |
| `internal/clienterror`                              |    1 | `small-packages.md`                                           | no         |

## Every new row

| Upstream test                                                                                              | Family                                              |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `TestAPICallTransportInvalidRequestProxyDoesNotFallBack`                                                   | `internal/api/handlers/management`                  |
| `TestAPICallTransportRequestProxyOverridesCredentialAndGlobalProxy`                                        | `internal/api/handlers/management`                  |
| `TestAPICallUsesRequestProxyURL`                                                                           | `internal/api/handlers/management`                  |
| `TestCodexAlphaSearchOptInAPIKeyResolvesModelAlias`                                                        | `internal/api`                                      |
| `TestCodexAlphaSearchOptInAPIKeyStripsCredentialPrefix`                                                    | `internal/api`                                      |
| `TestRealtimeStandardRoutesAndClientSecretAuth`                                                            | `internal/api`                                      |
| `TestRewriteCodexAlphaSearchModel`                                                                         | `internal/api`                                      |
| `TestClaudeThinkingReplayAppendsAssistantTurns`                                                            | `internal/cache`                                    |
| `TestClaudeThinkingReplayClearDoesNotClearKimiState`                                                       | `internal/cache`                                    |
| `TestHandleHangupForwardsPinnedOAuthCall`                                                                  | `internal/client/codex/live`                        |
| `TestHandleHangupRejectsDifferentAPIPrincipal`                                                             | `internal/client/codex/live`                        |
| `TestUnsupportedRealtimeCapabilitiesUseStandardError`                                                      | `internal/client/codex/live`                        |
| `TestApplyClientSecretCallSession`                                                                         | `internal/client/codex/live`                        |
| `TestClientSecretStoreRejectsExpiredToken`                                                                 | `internal/client/codex/live`                        |
| `TestCreateClientSecretMapsStandardRealtimeModel`                                                          | `internal/client/codex/live`                        |
| `TestCreateClientSecretRejectsUnsupportedSessionType`                                                      | `internal/client/codex/live`                        |
| `TestLiveSelectionHeadersRemoveLocalClientSecret`                                                          | `internal/client/codex/live`                        |
| `TestNormalizeClientSecretSessionHandlesWhitespaceNullAndRejectsArrays`                                    | `internal/client/codex/live`                        |
| `TestReadClientSecretBodyRejectsOversizedSession`                                                          | `internal/client/codex/live`                        |
| `TestSidebandRejectsClientSecretScopeMismatch`                                                             | `internal/client/codex/live`                        |
| `TestSidebandRejectsStandardPrincipalScopeMismatch`                                                        | `internal/client/codex/live`                        |
| `TestStandardRealtimeCallMapsModelAndLocation`                                                             | `internal/client/codex/live`                        |
| `TestHandleDirectWebsocketAppliesClientSecretSession`                                                      | `internal/client/codex/live`                        |
| `TestHandleDirectWebsocketRejectsClientSecretModelMismatch`                                                | `internal/client/codex/live`                        |
| `TestHandleDirectWebsocketRelaysStandardRealtimeFrames`                                                    | `internal/client/codex/live`                        |
| `TestHTTPStatusFromError`                                                                                  | `internal/clienterror`                              |
| `TestParseConfigBytesRequestRetry`                                                                         | `internal/config`                                   |
| `TestStreamChunkRequestBodyPolicyBySchemaVersion`                                                          | `internal/pluginhost`                               |
| `TestPluginRefreshCompatExecutorDelegatesExecuteAndRefresh`                                                | `internal/pluginhost`                               |
| `TestPluginRefreshCompatExecutorErrorsWhenRefreshUnavailable`                                              | `internal/pluginhost`                               |
| `TestPluginRefreshCompatExecutorNoOpForAPIKeyAuth`                                                         | `internal/pluginhost`                               |
| `TestWithXAIBuiltinsIncludesImage20`                                                                       | `internal/registry`                                 |
| `TestAntigravityBuildRequestKeepsConnectionAlive`                                                          | `internal/runtime/executor`                         |
| `TestAntigravityCountTokensReusesUpstreamConnection`                                                       | `internal/runtime/executor`                         |
| `TestAntigravityExecuteStreamReusesUpstreamConnection`                                                     | `internal/runtime/executor`                         |
| `TestAntigravityHTTPRequestConcurrentSessionsStayIsolated`                                                 | `internal/runtime/executor`                         |
| `TestAntigravityHTTPRequestReusesUpstreamConnection`                                                       | `internal/runtime/executor`                         |
| `TestAntigravityConcurrentRequestsReusePooledConnections`                                                  | `internal/runtime/executor`                         |
| `TestAntigravityHTTP11TransportReusesPoolWithoutAuthID`                                                    | `internal/runtime/executor`                         |
| `TestAntigravityPoolLimitsOnlyWiden`                                                                       | `internal/runtime/executor`                         |
| `TestAntigravityProxiedHTTP11TransportRejectsInvalidProxy`                                                 | `internal/runtime/executor`                         |
| `TestAntigravityProxiedRequestsReuseOneConnection`                                                         | `internal/runtime/executor`                         |
| `TestAntigravityTransportCacheEvictsStalePools`                                                            | `internal/runtime/executor`                         |
| `TestAntigravityTransportMatchesNativeTLSProfile`                                                          | `internal/runtime/executor`                         |
| `TestAntigravityTransportScopeFallsBackToStableMarkers`                                                    | `internal/runtime/executor`                         |
| `TestAntigravityTransportScopeIgnoresNonUniqueLabel`                                                       | `internal/runtime/executor`                         |
| `TestAntigravityTransportScopeNeverLeaksToken`                                                             | `internal/runtime/executor`                         |
| `TestAntigravityTransportScopeSurvivesAccessTokenRotation`                                                 | `internal/runtime/executor`                         |
| `TestNewAntigravityHTTPClientDistinctProxiesUseDistinctPools`                                              | `internal/runtime/executor`                         |
| `TestNewAntigravityHTTPClientKeepsForeignRoundTripper`                                                     | `internal/runtime/executor`                         |
| `TestNewAntigravityHTTPClientRejectsTypedNilContextTransport`                                              | `internal/runtime/executor`                         |
| `TestNewAntigravityHTTPClientScopesPoolsByAuthIdentity`                                                    | `internal/runtime/executor`                         |
| `TestNewAntigravityHTTPClientSharesTransport`                                                              | `internal/runtime/executor`                         |
| `TestAntigravityProvenanceScansMatchLegacyArraySemantics`                                                  | `internal/runtime/executor`                         |
| `TestApplyAntigravityContentEditsWithSJSONFallback`                                                        | `internal/runtime/executor`                         |
| `TestNormalizeAntigravityGeminiFunctionResponseRolesMatchesLegacy`                                         | `internal/runtime/executor`                         |
| `TestSanitizeAntigravityRequestSchemasMatchesLegacy`                                                       | `internal/runtime/executor`                         |
| `TestAntigravityReasoningReplayAccumulatorUsesIndexedContextHash`                                          | `internal/runtime/executor`                         |
| `TestAntigravityReasoningReplayItemsFromIndexMatchLegacy`                                                  | `internal/runtime/executor`                         |
| `TestAntigravityReasoningReplayItemsNilnessMatchesLegacy`                                                  | `internal/runtime/executor`                         |
| `TestAntigravityReplayContextFingerprintsMatchLegacy`                                                      | `internal/runtime/executor`                         |
| `TestAntigravityReplayLegacyItemWithoutTargetHash`                                                         | `internal/runtime/executor`                         |
| `TestAntigravityReplayMergeRandomizedDifferential`                                                         | `internal/runtime/executor`                         |
| `TestAntigravityReplayNonArrayPartsFailsClosed`                                                            | `internal/runtime/executor`                         |
| `TestAntigravityReplayRequestIndexRandomizedDifferential`                                                  | `internal/runtime/executor`                         |
| `TestApplyAntigravityReasoningReplayItemsRebuildsIndexAfterMutation`                                       | `internal/runtime/executor`                         |
| `TestFilterAntigravityReasoningReplayItemsWithIndexMatchesLegacy`                                          | `internal/runtime/executor`                         |
| `TestClaudeExecutorCloakedRollingCacheBreakpointAdvances`                                                  | `internal/runtime/executor`                         |
| `TestShouldEnsureCacheControl`                                                                             | `internal/runtime/executor`                         |
| `TestUpgradeClaudeCacheControlTTL`                                                                         | `internal/runtime/executor`                         |
| `TestApplyClaudeHeadersPreservesAsyncOnlyForConfirmedNative`                                               | `internal/runtime/executor`                         |
| `TestClaudeBodyNeedsBillingFallbackTracksSystemPresence`                                                   | `internal/runtime/executor`                         |
| `TestClaudeExecutorMinimalNativeHelperPreservesMarkerlessWire`                                             | `internal/runtime/executor`                         |
| `TestClaudeExecutorStructuredNativeHelperPreservesStreamProfile`                                           | `internal/runtime/executor`                         |
| `TestReverseRemapOAuthToolNamesPreservesUnrelatedMCPName`                                                  | `internal/runtime/executor`                         |
| `TestReverseRemapOAuthToolNamesRecoversMangledAliases`                                                     | `internal/runtime/executor`                         |
| `TestReverseRemapOAuthToolNamesRecoversRepeatedServerAlias`                                                | `internal/runtime/executor`                         |
| `TestReverseRemapOAuthToolNamesRejectsUnsafeMangledAliases`                                                | `internal/runtime/executor`                         |
| `TestClaudeCodeContextManagementNeverOutlivesEligibleThinking`                                             | `internal/runtime/executor`                         |
| `TestClaudeExecutor_CacheTTLIsPairedWithExtendedCacheTTLBeta`                                              | `internal/runtime/executor`                         |
| `TestClaudeExecutor_ConfirmedClaudeCodeWithoutCacheControlPreservesContent`                                | `internal/runtime/executor`                         |
| `TestNormalizeClaudeSamplingForUpstreamNativeDropsOnlyRejectedCombinations`                                | `internal/runtime/executor`                         |
| `TestNormalizeClaudeSamplingForUpstreamNativeKeepsMeasuredHelperTemperature`                               | `internal/runtime/executor`                         |
| `TestClaudeExecutor_ConfirmedNativeLegacyMidSystemMessageForwarded`                                        | `internal/runtime/executor`                         |
| `TestClaudeExecutor_LegacyMidSystemMessageForwardedToThirdPartyGateway`                                    | `internal/runtime/executor`                         |
| `TestClaudeExecutor_LegacyMidSystemMessageOptInStillRebuilds`                                              | `internal/runtime/executor`                         |
| `TestClaudeExecutor_LegacyMidSystemMessageRejectedOnEveryUpstreamPath`                                     | `internal/runtime/executor`                         |
| `TestClaudeExecutor_PayloadOverrideCannotSmuggleLegacyMidSystemMessage`                                    | `internal/runtime/executor`                         |
| `TestClaudeExecutor_PayloadOverrideDoesNotClaimMatchingCallerTurn`                                         | `internal/runtime/executor`                         |
| `TestClaudeExecutor_PayloadOverrideReconcilesRelocatedSystemPrompt`                                        | `internal/runtime/executor`                         |
| `TestClaudeExecutor_SupportedModelMidSystemMessageForwarded`                                               | `internal/runtime/executor`                         |
| `TestClaudePayloadHasMidSystemMessage`                                                                     | `internal/runtime/executor`                         |
| `TestTranslatedRequestNeverPairsLegacyModelWithMidSystemMessage`                                           | `internal/runtime/executor`                         |
| `TestValidateClaudeMidSystemMessageModel`                                                                  | `internal/runtime/executor`                         |
| `TestClaudeExecutorCompatThinkingReplayClearsAfterUpstreamBadRequest`                                      | `internal/runtime/executor`                         |
| `TestClaudeExecutorCompatThinkingReplayRestoresMultipleOmittedBlocks`                                      | `internal/runtime/executor`                         |
| `TestClaudeExecutorCompatThinkingReplayRestoresOmittedBlock`                                               | `internal/runtime/executor`                         |
| `TestClaudeExecutorCompatThinkingReplayRestoresOmittedBlockInStream`                                       | `internal/runtime/executor`                         |
| `TestClaudeThinkingReplayEnabledRequiresCompatClaudeAPIKey`                                                | `internal/runtime/executor`                         |
| `TestCodexAutoExecutorHTTPFallbackForwardsSequentialCutoffReasoningSummaryDelivery`                        | `internal/runtime/executor`                         |
| `TestCodexWebsocketsExecutorRestoresMultiAgentV2NamespaceAcrossIncrementalTurns`                           | `internal/runtime/executor`                         |
| `TestDetectClaudeCodeRequestAcceptsHelperFromNonBaselinePlatform`                                          | `internal/runtime/executor/helps`                   |
| `TestDetectClaudeCodeRequestAcceptsHelperSubagentParentSessionID`                                          | `internal/runtime/executor/helps`                   |
| `TestDetectClaudeCodeRequestRecognizesMeasuredHaikuHelpers`                                                | `internal/runtime/executor/helps`                   |
| `TestDetectClaudeCodeRequestRejectsHelperIdentityWithUnknownKeys`                                          | `internal/runtime/executor/helps`                   |
| `TestDetectClaudeCodeRequestRejectsHelperWithForeignSoftwareTuple`                                         | `internal/runtime/executor/helps`                   |
| `TestDetectClaudeCodeRequestRejectsHelperWithoutPlatformHeaders`                                           | `internal/runtime/executor/helps`                   |
| `TestDetectClaudeCodeRequestRejectsMalformedStructuredHaikuHelpers`                                        | `internal/runtime/executor/helps`                   |
| `TestDetectClaudeCodeRequestRejectsNearMissHaikuHelpers`                                                   | `internal/runtime/executor/helps`                   |
| `TestMeasuredHelperProfileIgnoresConfiguredStainlessTimeout`                                               | `internal/runtime/executor/helps`                   |
| `TestNormalizedClaudeBetaHeaderIsDeterministic`                                                            | `internal/runtime/executor/helps`                   |
| `TestSanitizeCodexInputItemIDsAvoidsNormalizationCollisions`                                               | `internal/runtime/executor/helps`                   |
| `TestSanitizeCodexInputItemIDsNormalizesCustomToolCallIDs`                                                 | `internal/runtime/executor/helps`                   |
| `TestSanitizeCodexInputItemIDsNormalizesCustomToolCallOutputIDs`                                           | `internal/runtime/executor/helps`                   |
| `TestSanitizeCodexInputItemIDsNormalizesResponseItemIDs`                                                   | `internal/runtime/executor/helps`                   |
| `TestSameByteSlice`                                                                                        | `internal/runtime/executor/helps`                   |
| `TestTranslateRequestPairMatchesSeparateTranslations`                                                      | `internal/runtime/executor/helps`                   |
| `TestTranslateRequestPairPreservesPluginHookInvocations`                                                   | `internal/runtime/executor/helps`                   |
| `TestTranslateRequestPairTranslatesDistinctPayloads`                                                       | `internal/runtime/executor/helps`                   |
| `TestNewTransportCacheDefaultsCapacity`                                                                    | `internal/runtime/executor/helps`                   |
| `TestTransportCacheBoundsEntries`                                                                          | `internal/runtime/executor/helps`                   |
| `TestTransportCacheConcurrentCallersShareOneInstance`                                                      | `internal/runtime/executor/helps`                   |
| `TestTransportCacheDoesNotCacheBuildFailures`                                                              | `internal/runtime/executor/helps`                   |
| `TestTransportCacheEvictsLeastRecentlyUsed`                                                                | `internal/runtime/executor/helps`                   |
| `TestTransportCachePurgeAndNilSafety`                                                                      | `internal/runtime/executor/helps`                   |
| `TestTransportCacheReusesEntriesPerKey`                                                                    | `internal/runtime/executor/helps`                   |
| `TestFailFromErrorsMapsContextStatuses`                                                                    | `internal/runtime/executor/helps`                   |
| `TestCloseConnectionBodyClosesConnectionBeforeBodyOnce`                                                    | `internal/runtime/executor/helps`                   |
| `TestUtlsRoundTripperDialUsesRequestContext`                                                               | `internal/runtime/executor/helps`                   |
| `TestUtlsRoundTripperHandshakeUsesRequestContext`                                                          | `internal/runtime/executor/helps`                   |
| `TestKimiExecutorPreservesAssistantContentAndToolCallsFromResponsesHistory`                                | `internal/runtime/executor`                         |
| `TestKimiExecutorRequestToFormatMatchesWireProtocol`                                                       | `internal/runtime/executor`                         |
| `TestNormalizeKimiToolMessageLinks_DoesNotReuseUnavailableReasoning`                                       | `internal/runtime/executor`                         |
| `TestNormalizeKimiToolMessageLinks_ReplacesUnavailableReasoningContent`                                    | `internal/runtime/executor`                         |
| `TestNormalizeKimiToolMessageLinks_UnavailableReasoningDoesNotOverridePreviousReasoning`                   | `internal/runtime/executor`                         |
| `TestOpenAICompatExecutorResponsesStreamFailsOnEOFWithoutDone`                                             | `internal/runtime/executor`                         |
| `TestOpenAICompatExecutorResponsesStreamHandlesAdditionalErrorShapes`                                      | `internal/runtime/executor`                         |
| `TestOpenAICompatExecutorResponsesStreamPreservesNamedErrorEvent`                                          | `internal/runtime/executor`                         |
| `TestOpenAICompatExecutorResponsesStreamPreservesUpstreamDataError`                                        | `internal/runtime/executor`                         |
| `TestOpenAICompatExecutorUsesCompatibleClaudeTranslation`                                                  | `internal/runtime/executor`                         |
| `TestXAIExecutorPrepareNormalizesClaudeWebSearchToolChoice`                                                | `internal/runtime/executor`                         |
| `TestXAIStatusErr_BadCredentials403RemapsToUnauthorized`                                                   | `internal/runtime/executor`                         |
| `TestXAIStatusErr_BadCredentialsByMessageOnly`                                                             | `internal/runtime/executor`                         |
| `TestXAIStatusErr_BadCredentialsNestedErrorCode`                                                           | `internal/runtime/executor`                         |
| `TestXAIStatusErr_EmptyBodyForbiddenUnchanged`                                                             | `internal/runtime/executor`                         |
| `TestXAIStatusErr_Generic403Unchanged`                                                                     | `internal/runtime/executor`                         |
| `TestParseXAIWebsocketBareErrorBadCredentialsRemapsToUnauthorized`                                         | `internal/runtime/executor`                         |
| `TestParseXAIWebsocketErrorBadCredentialsRemapsToUnauthorized`                                             | `internal/runtime/executor`                         |
| `TestDecideSignatureCompatibility_GrokDropsBlock`                                                          | `internal/signature`                                |
| `TestDetectSignatureProvider_NeverClassifiesGrok`                                                          | `internal/signature`                                |
| `TestSignatureProviderFromModelName_Grok`                                                                  | `internal/signature`                                |
| `TestDecideSignatureCompatibility_KimiDropsSignatureNotBlock`                                              | `internal/signature`                                |
| `TestDecideSignatureCompatibility_KimiPreservesNativeSignature`                                            | `internal/signature`                                |
| `TestDetectSignatureProvider_KimiProbeDoesNotDisturbCatalog`                                               | `internal/signature`                                |
| `TestDetectSignatureProvider_KimiRunsAfterEnvelopeProbes`                                                  | `internal/signature`                                |
| `TestInspectGrokEncryptedContent_RejectsKimiLengths`                                                       | `internal/signature`                                |
| `TestInspectKimiThinkingSignature_NativeCorpus`                                                            | `internal/signature`                                |
| `TestInspectKimiThinkingSignature_RejectsLowEntropyFiller`                                                 | `internal/signature`                                |
| `TestInspectKimiThinkingSignature_RejectsMalformedInput`                                                   | `internal/signature`                                |
| `TestInspectKimiThinkingSignature_RejectsNeighbouringLengths`                                              | `internal/signature`                                |
| `TestInspectKimiThinkingSignature_RejectsSelfDescribingEnvelope`                                           | `internal/signature`                                |
| `TestInspectKimiThinkingSignature_ReportsMode`                                                             | `internal/signature`                                |
| `TestKimiThinkingSignatureLengths_MatchDecodedSizes`                                                       | `internal/signature`                                |
| `TestSignatureProviderFromModelName_Kimi`                                                                  | `internal/signature`                                |
| `TestConvertGeminiRequestToAntigravityBoundsLargePayloadCopies`                                            | `internal/translator/antigravity/gemini`            |
| `TestConvertGeminiRequestToClaude_DropsHiddenThoughtParts`                                                 | `internal/translator/claude/gemini`                 |
| `TestConvertClaudeResponseToOpenAIResponses_RestoresAdditionalNamespaceCustomToolCall`                     | `internal/translator/claude/openai/responses`       |
| `TestConvertClaudeResponseToOpenAIResponsesNonStream_RestoresAdditionalNamespaceCustomToolCall`            | `internal/translator/claude/openai/responses`       |
| `TestConvertGeminiRequestToCodex_DropsHiddenThoughtParts`                                                  | `internal/translator/codex/gemini`                  |
| `TestConvertCodexResponseToOpenAI_ToolCallStateFallsBackFromUnknownItemID`                                 | `internal/translator/codex/openai/chat-completions` |
| `TestSetResponsesToolCallIdentity`                                                                         | `internal/translator/common`                        |
| `TestConvertGeminiRequestToGeminiReusesLargeNormalizedPayload`                                             | `internal/translator/gemini/gemini`                 |
| `TestConvertClaudeRequestToOpenAIWithCompatDoesNotAddReasoningWithoutThinking`                             | `internal/translator/openai/claude`                 |
| `TestConvertClaudeRequestToOpenAIWithCompatPreservesIncompatibleThinking`                                  | `internal/translator/openai/claude`                 |
| `TestConvertClaudeRequestToOpenAIWithCompatPreservesThinkingWithToolCalls`                                 | `internal/translator/openai/claude`                 |
| `TestConvertClaudeRequestToOpenAIWithoutCompatDoesNotAddReasoningForToolCalls`                             | `internal/translator/openai/claude`                 |
| `TestStreamingTool_EmptyNameArgsOnlyNoID`                                                                  | `internal/translator/openai/claude`                 |
| `TestStreamingTool_EmptyNameWithoutSignalIsSuppressed`                                                     | `internal/translator/openai/claude`                 |
| `TestStreamingTool_MixedEmptyNameAndValid`                                                                 | `internal/translator/openai/claude`                 |
| `TestStreamingTool_StopReasonMixedEmptyNameAndValid`                                                       | `internal/translator/openai/claude`                 |
| `TestConvertGeminiRequestToOpenAI_DropsHiddenThoughtParts`                                                 | `internal/translator/openai/gemini`                 |
| `TestConvertOpenAIResponsesRequestToOpenAIChatCompletions_DeduplicatesNamespaceQualifiedCollision`         | `internal/translator/openai/openai/responses`       |
| `TestConvertOpenAIResponsesRequestToOpenAIChatCompletions_DeduplicatesToolsAcrossAdditionalTools`          | `internal/translator/openai/openai/responses`       |
| `TestConvertOpenAIResponsesRequestToOpenAIChatCompletions_DoesNotMergeToolCallsAcrossUserMessage`          | `internal/translator/openai/openai/responses`       |
| `TestConvertOpenAIResponsesRequestToOpenAIChatCompletions_KeepsDistinctToolsFromBothSources`               | `internal/translator/openai/openai/responses`       |
| `TestConvertOpenAIResponsesRequestToOpenAIChatCompletions_MergesDistinctReasoningWithinAssistantTurn`      | `internal/translator/openai/openai/responses`       |
| `TestConvertOpenAIResponsesRequestToOpenAIChatCompletions_PreservesAssistantContentWithToolCalls`          | `internal/translator/openai/openai/responses`       |
| `TestConvertOpenAIResponsesRequestToOpenAIChatCompletions_PreservesCustomToolOutputFallbacks`              | `internal/translator/openai/openai/responses`       |
| `TestConvertOpenAIResponsesRequestToOpenAIChatCompletions_ReplacesUnavailableReasoningWithinAssistantTurn` | `internal/translator/openai/openai/responses`       |
| `TestConvertOpenAIResponsesRequestToOpenAIChatCompletions_UnwrapsStringifiedCustomToolOutputImages`        | `internal/translator/openai/openai/responses`       |
| `TestResponsesCustomToolNames_FollowsMergedDeclaration`                                                    | `internal/translator/openai/openai/responses`       |
| `TestResponsesCustomToolNames_OnlyReportsMergedTools`                                                      | `internal/translator/openai/openai/responses`       |
| `TestResponsesSingleCustomToolName_CountsDeduplicatedTools`                                                | `internal/translator/openai/openai/responses`       |
| `TestSplitResponsesQualifiedFunctionCallFromRequest_FirstDeclarationWins`                                  | `internal/translator/openai/openai/responses`       |
| `TestSplitResponsesQualifiedFunctionCallFromRequest_MatchesMergedToolIdentity`                             | `internal/translator/openai/openai/responses`       |
| `TestConvertOpenAIChatCompletionsResponseToOpenAIResponses_DoesNotCompleteReasoningOnlyStream`             | `internal/translator/openai/openai/responses`       |
| `TestConvertOpenAIChatCompletionsResponseToOpenAIResponses_FinalizesOpenMessageAtStreamEnd`                | `internal/translator/openai/openai/responses`       |
| `TestParseGJSONBytesNoCopy`                                                                                | `internal/util`                                     |
| `TestParseGJSONBytesNoCopyEmptyInput`                                                                      | `internal/util`                                     |
| `TestParseGJSONBytesNoCopyReferencesInput`                                                                 | `internal/util`                                     |
| `TestInPlaceByteWritesAreReviewed`                                                                         | `internal/util`                                     |
| `TestNoInPlaceSJSONWrites`                                                                                 | `internal/util`                                     |
| `TestConfigSynthesizer_RequestRetry`                                                                       | `internal/watcher/synthesizer`                      |
| `TestAddRequestRetryToMetadata`                                                                            | `internal/watcher/synthesizer`                      |
| `TestExecutionErrorMessageMapsContextStatuses`                                                             | `sdk/api/handlers`                                  |
| `TestStatusFromErrorMapsContextStatuses`                                                                   | `sdk/api/handlers`                                  |
| `TestWriteErrorResponse_ContextCanceledUses499`                                                            | `sdk/api/handlers`                                  |
| `TestHandlerStreamInterceptorLegacySchemaClonesRequestBodiesOnPayloadChunks`                               | `sdk/api/handlers`                                  |
| `TestExecuteStreamWithAuthManager_ResetsResponsesValidatorOnBootstrapRetry`                                | `sdk/api/handlers`                                  |
| `TestBuildOpenAIResponsesStreamFailedChunkPreservesNestedError`                                            | `sdk/api/handlers`                                  |
| `TestCanonicalXAIImagesModelPreservesImage20`                                                              | `sdk/api/handlers/openai`                           |
| `TestCollectImagesAllowsMultilineSSEData`                                                                  | `sdk/api/handlers/openai`                           |
| `TestCollectImagesPrefersPendingErrorWhenDataChannelCloses`                                                | `sdk/api/handlers/openai`                           |
| `TestCollectImagesRejectsPayloadErrorBeforeCompleted`                                                      | `sdk/api/handlers/openai`                           |
| `TestForwardImagesStreamCancelsWithPayloadError`                                                           | `sdk/api/handlers/openai`                           |
| `TestForwardRawImageStreamPrefersPendingErrorOnClose`                                                      | `sdk/api/handlers/openai`                           |
| `TestSSEFrameAccumulatorFlushesDataOnlyFrame`                                                              | `sdk/api/handlers/openai`                           |
| `TestSSEFrameAccumulatorKeepsMultipleFramesDistinct`                                                       | `sdk/api/handlers/openai`                           |
| `TestWriteImagesStreamErrorEventSanitizesPayload`                                                          | `sdk/api/handlers/openai`                           |
| `TestForwardResponsesStreamDoesNotAppendFailureAfterTerminalEvent`                                         | `sdk/api/handlers/openai`                           |
| `TestForwardResponsesStreamExposesTerminalErrors`                                                          | `sdk/api/handlers/openai`                           |
| `TestForwardResponsesStreamExposesTransportErrorAfterOutputForCodex`                                       | `sdk/api/handlers/openai`                           |
| `TestForwardResponsesStreamFailsWhenUpstreamClosesWithoutTerminalEvent`                                    | `sdk/api/handlers/openai`                           |
| `TestForwardResponsesStreamPreservesNestedResponseError`                                                   | `sdk/api/handlers/openai`                           |
| `TestForwardResponsesStreamReportsDataOnlyErrorFlushedAtEOF`                                               | `sdk/api/handlers/openai`                           |
| `TestForwardResponsesStreamSanitizesDiagnosticErrorDetails`                                                | `sdk/api/handlers/openai`                           |
| `TestForwardResponsesStreamSanitizesLastEventDiagnostic`                                                   | `sdk/api/handlers/openai`                           |
| `TestForwardResponsesStreamSanitizesPayloadErrorsAndStopsAtFailure`                                        | `sdk/api/handlers/openai`                           |
| `TestForwardResponsesStreamUsesResponseFailedForCodex`                                                     | `sdk/api/handlers/openai`                           |
| `TestResponsesHandlerAcceptsMultilineDataAcrossExecutorChunks`                                             | `sdk/api/handlers/openai`                           |
| `TestResponsesHandlerCommitsValidFrameBeforeMalformedFrameInSameChunk`                                     | `sdk/api/handlers/openai`                           |
| `TestResponsesHandlerDoesNotCommitHeadersForIncompleteFirstFrame`                                          | `sdk/api/handlers/openai`                           |
| `TestResponsesHandlerDoesNotLoseErrorBeforeFirstPayload`                                                   | `sdk/api/handlers/openai`                           |
| `TestResponsesHandlerEmitsFailureWhenDataOnlyStreamClosesCleanly`                                          | `sdk/api/handlers/openai`                           |
| `TestResponsesHandlerEmitsFailureWhenExecutorStopsAfterPartialOutput`                                      | `sdk/api/handlers/openai`                           |
| `TestResponsesHandlerFlushesDataOnlyFrameBeforeStreamingError`                                             | `sdk/api/handlers/openai`                           |
| `TestResponsesHandlerPreservesDirectResponseBeforeFirstFrame`                                              | `sdk/api/handlers/openai`                           |
| `TestResponsesHandlerRejectsStreamClosedBeforeFirstPayload`                                                | `sdk/api/handlers/openai`                           |
| `TestResponsesHandlerSanitizesErrorBeforeFirstFrame`                                                       | `sdk/api/handlers/openai`                           |
| `TestSanitizeResponsesStreamErrorMessageNormalizesSuccessStatus`                                           | `sdk/api/handlers/openai`                           |
| `TestResponsesSSEFramerFlushesMultilineDataWithoutDelimiter`                                               | `sdk/api/handlers/openai`                           |
| `TestResponsesSSEFramerUsesErrorEventOverPayloadType`                                                      | `sdk/api/handlers/openai`                           |
| `TestResponsesSSEFramerUsesPayloadErrorOverCompletedEvent`                                                 | `sdk/api/handlers/openai`                           |
| `TestResponsesSSEFramerWaitsForEventFieldAfterData`                                                        | `sdk/api/handlers/openai`                           |
| `TestNormalizeResponseSubsequentRequestBoundsTranscriptAllocations`                                        | `sdk/api/handlers/openai`                           |
| `TestRepairResponsesWebsocketToolCallsDeduplicatesInputItemsByID`                                          | `sdk/api/handlers/openai`                           |
| `TestResponsesWebsocketFallbackTurnBoundsTranscriptAllocations`                                            | `sdk/api/handlers/openai`                           |
| `TestResponsesWebsocketToolCacheScanPreservesJSONRequestSemantics`                                         | `sdk/api/handlers/openai`                           |
| `TestResponsesWebsocketToolCacheScansDoNotCopyLargePayloads`                                               | `sdk/api/handlers/openai`                           |
| `TestResponsesWebsocketToolCacheTurnDoesNotRetainRequestBackingStorage`                                    | `sdk/api/handlers/openai`                           |
| `TestForwardStreamNormalizesErrorBeforeWriteAndCancel`                                                     | `sdk/api/handlers`                                  |
| `TestPendingStreamErrorIgnoresUnavailableErrors`                                                           | `sdk/api/handlers`                                  |
| `TestPendingStreamErrorReturnsBufferedError`                                                               | `sdk/api/handlers`                                  |
| `TestValidateSSEDataJSONAllowsMultilinePayload`                                                            | `sdk/api/handlers`                                  |
| `TestManager_DeepSeekCredentialFailuresRotateCredential`                                                   | `sdk/cliproxy/auth`                                 |
| `TestManager_DeepSeekInsufficientBalanceRotatesCredentialAndRebindsSession`                                | `sdk/cliproxy/auth`                                 |
| `TestRefreshAuthForRequest_UsesExecutorKeyFromAuth`                                                        | `sdk/cliproxy/auth`                                 |
| `TestBuiltInSelectorCooldownErrorPreservesRouteModel`                                                      | `sdk/cliproxy/auth`                                 |
| `TestRequestRetryOverride`                                                                                 | `sdk/cliproxy/auth`                                 |
| `TestRegisterExecutorForAuth_OpenAICompatInfoPathAlsoWrapsPluginRefresh`                                   | `sdk/cliproxy`                                      |
| `TestRegisterExecutorForAuth_OpenAICompatWithoutPluginAuthProviderStaysBare`                               | `sdk/cliproxy`                                      |
| `TestRegisterExecutorForAuth_PluginAuthProviderWrapsOpenAICompatRefresh`                                   | `sdk/cliproxy`                                      |
| `TestUnregisterOpenAICompatExecutorRemovesPluginRefreshWrapper`                                            | `sdk/cliproxy`                                      |
| `TestHasPluginHooks`                                                                                       | `sdk/translator`                                    |
