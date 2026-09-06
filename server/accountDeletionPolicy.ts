export function isIdentifiableCommunitySubmission(data: Record<string, any>): boolean {
  return data.verificationScope === 'community_submission_pending'
    || data.verificationScope === 'reviewed_community_observation'
    || data.source?.type === 'user_observation'
    || data.provenanceClass === 'USER_ENTERED'
    || data.provenanceClass === 'USER_OBSERVED';
}
