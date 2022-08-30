import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';


interface SamuelbagattinComStackProps extends cdk.StackProps {
	samuelbagattinCertificateArn: string;
	hostedZoneId: string;
}

export class SamuelbagattinComStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: SamuelbagattinComStackProps) {
		super(scope, id, props);


		const redirectFunction = new cdk.aws_cloudfront.experimental.EdgeFunction(this, 'redirect-function', {
			functionName: 'samuelbagattincom-redirect-function',
			code: new cdk.aws_lambda.InlineCode(`
'use strict';

exports.handler = (event, context, callback) => {
    /*
     * Generate HTTP redirect response with 302 status code and Location header.
     */
    const response = {
        status: '302',
        statusDescription: 'Found',
        headers: {
            location: [{
                key: 'Location',
                value: 'http://github.com/samuelbagattin',
            }],
        },
    };
    callback(null, response);
};
      `),
			logRetention: cdk.aws_logs.RetentionDays.TWO_WEEKS,
			handler: "index.handler",
			runtime: cdk.aws_lambda.Runtime.NODEJS_16_X
		})

		const dummyBucket = new cdk.aws_s3.Bucket(this, 'DummyBucket', {
			versioned: false,
		})
		// create new oai
		const oai = new cdk.aws_cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
			comment: 'samuelbagattin.com',
		});
		dummyBucket.grantRead(oai)


		const distribution = new cdk.aws_cloudfront.Distribution(this, 'distro', {
			domainNames: ['samuelbagattin.com'],
			certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(this, 'urlite-certificate', props.samuelbagattinCertificateArn),
			httpVersion: cdk.aws_cloudfront.HttpVersion.HTTP2_AND_3,
			defaultBehavior: {
				origin: new cdk.aws_cloudfront_origins.S3Origin(dummyBucket, {
					originAccessIdentity:oai,
				}),
				edgeLambdas: [{
					functionVersion: redirectFunction.currentVersion,
					eventType: cdk.aws_cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
					includeBody: false,
				}],
				viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
			},
		});

		const hostedZone = cdk.aws_route53.HostedZone.fromHostedZoneAttributes(this, 'SamuelBagattinHostedZone', {
			zoneName: 'samuelbagattin.com',
			hostedZoneId: props.hostedZoneId,
		});
		new cdk.aws_route53.AaaaRecord(this, 'samuelbagattin.com', {
			zone: hostedZone,
			target: cdk.aws_route53.RecordTarget.fromAlias(new cdk.aws_route53_targets.CloudFrontTarget(distribution)),
			recordName: 'samuelbagattin.com',
		});

		new cdk.aws_route53.ARecord(this, 'samuelbagattin.com_ipv4', {
			zone: hostedZone,
			target: cdk.aws_route53.RecordTarget.fromAlias(new cdk.aws_route53_targets.CloudFrontTarget(distribution)),
			recordName: 'samuelbagattin.com',
		});

	}
}
