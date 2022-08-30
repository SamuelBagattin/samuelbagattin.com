#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {SamuelbagattinComStack} from '../lib/samuelbagattin.com-stack';
import {ListHostedZonesByNameCommand, Route53Client} from "@aws-sdk/client-route-53";
import {ACMClient, ListCertificatesCommand} from "@aws-sdk/client-acm";


(async () => {
	const app = new cdk.App();
	const route53Client = new Route53Client({});
	const hostedZones = await route53Client.send(new ListHostedZonesByNameCommand({
		DNSName: 'samuelbagattin.com',
		MaxItems: 1,
	}))
	const acmClient = new ACMClient({
		region: 'us-east-1'
	});
	const certificates = await acmClient.send(new ListCertificatesCommand({}))
	const hostedZoneId = hostedZones.HostedZones![0].Id!.replace(/^\/hostedzone\//, "")
	if (hostedZoneId == undefined) {
		throw new Error("Hosted zone not found")
	}
	const certificateArn = certificates.CertificateSummaryList!.find(certificate => certificate.DomainName === 'samuelbagattin.com')!.CertificateArn!
	if (certificateArn == undefined) {
		throw new Error("Certificate not found")
	}
	new SamuelbagattinComStack(app, 'SamuelbagattinComStack', {
		hostedZoneId: hostedZoneId,
		samuelbagattinCertificateArn: certificateArn,
		env: {
			region: 'eu-west-1'
		}
	});
})();