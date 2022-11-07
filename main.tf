terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2"
}

variable "domain" {
  default = "terraform-open-search"
}

variable "region" {
  default = "us-east-2"
}

provider "aws" {
  region = var.region
}

resource "aws_default_vpc" "default" { }

resource "aws_default_security_group" "default" {
  vpc_id = aws_default_vpc.default.id
  ingress {
    protocol  = -1
    self      = true
    from_port = 0
    to_port   = 0
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

}
resource "aws_security_group" "app_server_security_group" {
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
  ingress = [
    {
      cidr_blocks      = ["0.0.0.0/0",]
      description      = ""
      from_port        = 22
      ipv6_cidr_blocks = []
      prefix_list_ids  = []
      protocol         = "tcp"
      security_groups  = []
      self             = false
      to_port          = 60000
    }
  ]
}

resource "aws_default_subnet" "default" {
  availability_zone = "${var.region}a"
}

resource "aws_iam_policy" "policy" {
  name        = "test_policy"
  path        = "/"
  description = "My test policy"
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Action = [
          "ec2:Describe*",
        ]
        Effect   = "Allow"
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_role" "aws_ec2_iam_role" {
  name               = "aws_ec2_iam_role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        "Action" : "sts:AssumeRole",
        "Principal" : {
          "Service" : "ec2.amazonaws.com"
        },
        "Effect" : "Allow",
        "Sid" : ""
      }
    ]
  })
}
resource "aws_iam_policy_attachment" "test-attach" {
  name       = "test-attachment"
  roles      = [aws_iam_role.aws_ec2_iam_role.name]
  policy_arn = aws_iam_policy.policy.arn
}

resource "aws_iam_instance_profile" "test_profile" {
  name  = "test_profile"
  role = aws_iam_role.aws_ec2_iam_role.name
}



data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

resource "aws_opensearch_domain" "open_search" {
  domain_name    = var.domain
  engine_version = "Elasticsearch_7.10"

  ebs_options {
    ebs_enabled = true
    volume_size = 10
  }

  cluster_config {
    instance_type = "m4.large.search"

  }

  tags = {
    Domain = "TestDomain"
  }

  domain_endpoint_options {
    enforce_https = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name     = "example"
      master_user_password = "Example1#"
    }
  }

  encrypt_at_rest {
    enabled = true
  }


  node_to_node_encryption {
    enabled = true
  }


  access_policies = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:domain/${var.domain}/*"
    }
  ]
}
POLICY
}




resource "aws_ssm_parameter" "vpcId" {
  name        = "/default/vpc_id"
  description = "VPC IP"
  type        = "String"
  value       = aws_default_vpc.default.id
}
output "VPC_ID" {
  value = aws_default_vpc.default.id
}

resource "aws_ssm_parameter" "subnetId" {
  name        = "/default/subnet_id"
  description = "SUBNET ID"
  type        = "String"
  value       = aws_default_subnet.default.id
}
output "SUBNET_ID" {
  value = aws_default_subnet.default.id
}

resource "aws_ssm_parameter" "securityGroupId" {
  name        = "/default/security_group"
  description = "Security Group ID"
  type        = "String"
  value       = aws_default_security_group.default.id
}
output "SECURITY_GROUP_ID" {
  value = aws_default_security_group.default.id
}

resource "aws_ssm_parameter" "ec2SecurityGroupId" {
  name        = "/ec2/security_group"
  description = "EC2 Security Group ID"
  type        = "String"
  value       = aws_security_group.app_server_security_group.id
}

output "EC2_SECURITY_GROUP_ID" {
  value = aws_security_group.app_server_security_group.id
}


# Ec2
resource "aws_instance" "shared_infra" {
  ami                    = "ami-089a545a9ed9893b6"
  instance_type          = "t2.large"
  key_name               = "pokemon-infra"
  vpc_security_group_ids = [aws_default_security_group.default.id, aws_security_group.app_server_security_group.id]
  user_data              = file("./file.sh")
  iam_instance_profile = aws_iam_instance_profile.test_profile.name
  tags                   = {
    Name       = "PokemonInfraStructure"
    OpenSearch = aws_opensearch_domain.open_search.endpoint
  }
  root_block_device {
    volume_size = 20
  }
  depends_on = [aws_opensearch_domain.open_search]
}

## parameters.tf
resource "aws_ssm_parameter" "endpoint" {
  name        = "/ec2/public_ip"
  description = "Ec2 instance public IP"
  type        = "String"
  value       = aws_instance.shared_infra.public_ip
}

output "EC2_PUBLIC_IP" {
  value = aws_instance.shared_infra.public_ip
}
