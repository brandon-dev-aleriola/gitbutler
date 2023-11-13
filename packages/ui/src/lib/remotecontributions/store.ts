import type { PullRequest } from '$lib/github/types';
import type { RemoteBranch, CustomStore } from '$lib/vbranches/types';
import { RemoteContribution } from '$lib/remotecontributions/types';
import { Observable, combineLatest } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { storeToObservable } from '$lib/rxjs/store';

export function getRemoteContributionsStore(
	remoteBranchStore: CustomStore<RemoteBranch[] | undefined>,
	pullRequestObservable: Observable<PullRequest[]>
): Observable<RemoteContribution[]> {
	const remoteBranchObservable = storeToObservable(remoteBranchStore);
	return combineLatest([remoteBranchObservable, pullRequestObservable]).pipe(
		switchMap(
			([remoteBranches, pullRequests]) =>
				new Observable<RemoteContribution[]>((observer) => {
					const contributions = mergeBranchesAndPrs(pullRequests, remoteBranches || []);
					observer.next(contributions);
				})
		)
	);
}

function mergeBranchesAndPrs(
	pullRequests: PullRequest[],
	remoteBranches: RemoteBranch[]
): RemoteContribution[] {
	const contributions: RemoteContribution[] = [];
	// branches without pull requests
	contributions.push(
		...remoteBranches
			.filter((branch) => !pullRequests.some((pr) => brachesMatch(pr.branch_name, branch.name)))
			.map((branch) => new RemoteContribution(branch, undefined))
	);
	// pull requests without branches
	contributions.push(
		...pullRequests
			.filter((pr) => !remoteBranches.some((branch) => brachesMatch(pr.branch_name, branch.name)))
			.map((pr) => new RemoteContribution(undefined, pr))
	);
	// branches with pull requests
	contributions.push(
		...remoteBranches
			.filter((branch) => pullRequests.some((pr) => brachesMatch(pr.branch_name, branch.name)))
			.map(
				(branch) =>
					new RemoteContribution(
						branch,
						pullRequests.find((pr) => brachesMatch(pr.branch_name, branch.name))
					)
			)
	);
	return contributions;
}

function brachesMatch(left: string, right: string): boolean {
	return left.split('/').pop() === right.split('/').pop();
}
