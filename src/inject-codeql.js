module.exports = async ({github, owner, repo}) => {

    async function addCodeQLworkflow(github, owner, repo) {
        
        const { readFileSync } = require('fs')
        const path = 'codeql-analysis.yml'
        const content = readFileSync(`${process.env.GITHUB_WORKSPACE}/${path}`)
        
        const targetPath = ".github/workflows/codeql-analysis.yml"                                    
        console.log(`Uploading the CodeQL workflow to the forked repository`)
        github.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: targetPath,
            message: "🤖 Adding CodeQL workflow file",
            content: content.toString('base64'),
            sha: undefined
        })

        console.log('CodeQL workflow uploaded')
        return targetPath
    }

    async function deleteExistingWorkflows(github, owner, repo) {   
        console.log(`Deleting existing workflows in the fork`) 
        // load default branch from repo
        const {data: repository} = await github.rest.repos.get({
            owner,
            repo
        })

        console.log(`Default_branch for repo [${repo}] is [${repository.default_branch}]`)
        
        const ref = repository.default_branch
        try {
          // https://docs.github.com/en/rest/reference/git#get-a-reference
          const {
            data: {
              object: {sha}
            }
          } = await github.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
            owner,
            repo,
            ref: `heads/${ref}`
          })
          // https://docs.github.com/en/graphql/reference/mutations#createcommitonbranch
          const {
            createCommitOnBranch: {
              commit: {oid}
            }
          } = await github.graphql(
            `mutation (
          $nwo: String!,
          $branch: String!,
          $oid: GitObjectID!
        ) {
          createCommitOnBranch(input: {
            branch: { repositoryNameWithOwner: $nwo, branchName: $branch },
            expectedHeadOid: $oid,
            message: { headline: "🤖 Delete existing workflows" },
            fileChanges: {
              deletions: [{ path: ".github/workflows" }]
            }
          }) {
            commit { url,  oid }
          }
        }`,
            {
              nwo: `${owner}/${repo}`,
              branch: ref,
              oid: sha
            }
          )
          this.oid = oid || sha
        } catch (error) {
          throw error
        }
        return ref
      }

    console.log(`Looking at this repository: [${owner}/${repo}]`)
    const ref = await deleteExistingWorkflows(github, owner, repo)
    const path = await addCodeQLworkflow(github, owner, repo)

    return { ref, targetPath }
}