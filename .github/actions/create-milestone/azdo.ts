import * as vm from 'azure-devops-node-api';
import * as CoreInterfaces from 'azure-devops-node-api/interfaces/CoreInterfaces';
import * as CoreApi from 'azure-devops-node-api/CoreApi';
import * as WorkItemTrackingApi from 'azure-devops-node-api/WorkItemTrackingApi';
import * as WorkItemTrackingInterfaces from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import {
	JsonPatchDocument,
	JsonPatchOperation,
	Operation,
} from 'azure-devops-node-api/interfaces/common/VSSInterfaces';

export class DevopsClient {
	token: string;
	org: string;
	projectId: string;

    webApi?: vm.WebApi;
	witApi?: WorkItemTrackingApi.IWorkItemTrackingApi;

	constructor(
		token: string,
		org: string,
		projectId: string,
	) {
		this.token = token;
		this.org = org;
		this.projectId = projectId;
	}

	public async init() {
		let orgUrl = `https://dev.azure.com/${this.org}`;
		this.webApi = await this.getApi(orgUrl);
		this.witApi = await this.webApi.getWorkItemTrackingApi();
	}

	private async getApi(serverUrl: string): Promise<vm.WebApi> {
		let authHandler = vm.getHandlerFromToken(this.token);
		let vsts: vm.WebApi = new vm.WebApi(serverUrl, authHandler);
		await vsts.connect();
		return vsts;
	}

	async queryCurrentAndFutureSprints(): Promise<any[]> {
        const workApi = await this.webApi?.getWorkApi();
        const coreApiObject: CoreApi.CoreApi = await this.webApi!.getCoreApi();
        const project: CoreInterfaces.TeamProject = await coreApiObject.getProject(this.projectId);

        const teamContext: CoreInterfaces.TeamContext = {
            project: project.name,
            projectId: project.id,
            // team: 'Test Team',
            team: 'AuthAndData',
        };

		// it can succeed to set timeframe as current, but it will fail to set timeframe as future
		// const iterations = await workApi?.getTeamIterations(teamContext, 'future');

        const allIterations = await workApi?.getTeamIterations(teamContext);
		const res = allIterations?.filter((item) => {
			return item.attributes?.timeFrame != 0
		});
		// return res;
		return allIterations;
    }

	public async createItem(
		titleValue: string,
		areaValue: string,
		iterationValue: string,
		sprintPath: string,
	): Promise<WorkItemTrackingInterfaces.WorkItem> {
		let document: JsonPatchOperation[] = [];

		const title: JsonPatchOperation = {
			path: '/fields/System.Title',
			op: Operation.Add,
			value: titleValue,
		};
		document.push(title);

		const area: JsonPatchOperation = {
			path: '/fields/System.AreaPath',
			op: Operation.Add,
			value: areaValue,
		};
		// document.push(area);

		const iteration: JsonPatchOperation = {
			path: '/fields/System.IterationPath',
			op: Operation.Add,
			value: sprintPath ?? iterationValue,
		};
		// document.push(iteration);

		const item = await this.witApi!.createWorkItem(
			undefined,
			document as JsonPatchDocument,
			this.projectId,
			'Task',
		);
		return item;
	}
}
