// ============================================================
// SRA Assessment Data — Source: HHS SRA Tool v3.6
// Auto-generated from SRA_Tool_3_6.xlsx
// Place this file in: src/data/sraAssessment.ts
// ============================================================

export interface SRAResponse {
  text: string;
  riskScore: number;  // 0 = low compliance, 1 = good practice
  education: string;
}

export interface SRAQuestion {
  id: string;
  text: string;
  responses: SRAResponse[];
}

export interface SRASection {
  id: string;
  title: string;
  questions: SRAQuestion[];
}

export interface SRAAssessmentData {
  sections: SRASection[];
}

export const sraAssessmentData: SRAAssessmentData = {
  "sections": [
    {
      "id": "section_1",
      "title": "Section 1 - SRA Basics",
      "questions": [
        {
          "id": "1",
          "text": "Has your practice completed a security risk assessment (SRA) before?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "Continuing to complete security risk assessments will help safeguard the confidentiality, integrity, and availability of ePHI. Consider a vulnerability scan to assist in identification of technical vulnerabilities to improve your risk assessment."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Performing a security risk assessment periodically will help safeguard the confidentiality, integrity, and availability of ePHI. Consider scheduling a vulnerability scan to assist in identification of technical vulnerabilities to improve your risk assessment."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Performing a security risk assessment periodically will help safeguard the confidentiality, integrity, and availability of ePHI. Consider scheduling a vulnerability scan to assist in identification of technical vulnerabilities to improve your risk assessment."
            }
          ]
        },
        {
          "id": "2",
          "text": "Do you review and update your SRA?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option to protect the confidentiality, integrity, and availability of ePHI. Include language in your policies and procedures to review and update your risk assessment regularly."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider reviewing and updating your security risk assessment periodically. Include language in your policies and procedures to review and update your risk assessment regularly."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider reviewing and updating your security risk assessment periodically. Include language in your policies and procedures to review and update your risk assessment regularly."
            }
          ]
        },
        {
          "id": "3",
          "text": "How often do you review and update your SRA?",
          "responses": [
            {
              "text": "Periodically and in response to environmental or operational changes and/or security incidents.",
              "riskScore": 1,
              "education": "This is the most effective option to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "Periodically but not in response to environmental or operational changes and/or security incidents.",
              "riskScore": 0,
              "education": "An accurate and thorough security risk assessment should be reviewed and updated periodically, or in response to environmental or operational changes, or security incidents."
            },
            {
              "text": "Only in response to environmental or operational changes and/or security incidents.",
              "riskScore": 0,
              "education": "An accurate and thorough security risk assessment should be reviewed and updated periodically, or in response to environmental or operational changes, or security incidents."
            },
            {
              "text": "Ad hoc, without regular frequency.",
              "riskScore": 0,
              "education": "An accurate and thorough security risk assessment should be reviewed and updated periodically, or in response to environmental or operational changes, or security incidents."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider looking into whether your organization reviews and/or updates your SRA periodically, or in response to environmental or operational changes, or security incidents."
            }
          ]
        },
        {
          "id": "4",
          "text": "Do you include all information systems containing, processing, and/or transmitting ePHI in your SRA?",
          "responses": [
            {
              "text": "Yes. Our SRA covers all information systems that contain, process, or transmit ePHI.",
              "riskScore": 1,
              "education": "This is the most effective option to protect the confidentiality, integrity, and availability of ePHI. A comprehensive security risk assessment should include all information systems that contain, process, or transmit ePHI. Maintain a complete and accurate inventory of the Information Technology (IT) and Operational Technology (OT) assets in your organization to facilitate the implementation of optimal security controls."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Include all information systems that contain, process, or transmit ePHI in your security risk assessment. In addition, document your systems in a complete inventory. Maintain a complete and accurate inventory of the Information Technology (IT) and Operational Technology (OT) assets in your organization to facilitate the implementation of optimal security controls."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Include all information systems that contain, process, or transmit ePHI in your security risk assessment. In addition, document your systems in a complete inventory. Maintain a complete and accurate inventory of the Information Technology (IT) and Operational Technology (OT) assets in your organization to facilitate the implementation of optimal security controls."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Include all information systems that contain, process, or transmit ePHI in your security risk assessment. In addition, document your systems in a complete inventory. Maintain a complete and accurate inventory of the Information Technology (IT) and Operational Technology (OT) assets in your organization to facilitate the implementation of optimal security controls."
            }
          ]
        },
        {
          "id": "5",
          "text": "How do you verify that that your security measures comply with current HIPAA requirements?",
          "responses": [
            {
              "text": "We review our practice's Security Policies and Procedures and keep up to date on relevant guidance regarding protection of ePHI through listservs or other security publications.",
              "riskScore": 0,
              "education": "Security risk analysis is a foundational component of identifying and assessing ePHI risks and vulnerabilities in your practice. An accurate and thorough security risk assessment should be performed, reviewed, and updated periodically or in response to operational changes, security incidents, or the occurrence of a significant event. Additionally, consistently monitoring changes or updates to cybersecurity guidance related to ePHI protection will ensure you are aware of current requirements."
            },
            {
              "text": "We review the current regulations and do our best to meet them.",
              "riskScore": 0,
              "education": "Security risk analysis is a foundational component of identifying and assessing ePHI risks and vulnerabilities in your practice. An accurate and thorough security risk assessment should be performed, reviewed, and updated periodically or in response to operational changes, security incidents, or the occurrence of a significant event. Additionally, consistently monitoring changes or updates to cybersecurity guidance related to ePHI protection will ensure you are aware of current requirements."
            },
            {
              "text": "We try to follow the best practices for securing our ePHI but we are not sure we're meeting all the HIPAA security regulations.",
              "riskScore": 0,
              "education": "Security risk analysis is a foundational component of identifying and assessing ePHI risks and vulnerabilities in your practice. An accurate and thorough security risk assessment should be performed, reviewed, and updated periodically or in response to operational changes, security incidents, or the occurrence of a significant event. Additionally, consistently monitoring changes or updates to cybersecurity guidance related to ePHI protection will ensure you are aware of current requirements."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Security risk analysis is a foundational component of identifying and assessing ePHI risks and vulnerabilities in your practice. An accurate and thorough security risk assessment should be performed, reviewed, and updated periodically or in response to operational changes, security incidents, or the occurrence of a significant event. Additionally, consistently monitoring changes or updates to cybersecurity guidance related to ePHI protection will ensure you are aware of current requirements."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Security risk analysis is a foundational component of identifying and assessing ePHI risks and vulnerabilities in your practice. An accurate and thorough security risk assessment should be performed, reviewed, and updated periodically or in response to operational changes, security incidents, or the occurrence of a significant event. Additionally, consistently monitoring changes or updates to cybersecurity guidance related to ePHI protection will ensure you are aware of current requirements."
            }
          ]
        },
        {
          "id": "6",
          "text": "What do you include in your SRA documentation?",
          "responses": [
            {
              "text": "Our SRA documentation identifies and assesses potential threats and vulnerabilities (both technical and non-technical) to the confidentiality, integrity, and availability of all ePHI we create, receive, maintain, or transmit. Impact and likelihood ratings are assigned and risks determined. This allows us to understand severity. We develop corrective action plans as needed to mitigate identified security deficiencies according to which threats and vulnerabilities are most severe.",
              "riskScore": 1,
              "education": "This is the most effective option to protect the confidentiality, integrity, and availability of ePHI. Establish a data classification policy that categorizes data as, for example, Sensitive, Internal Use, or Public Use. Identify the types of records relevant to each category. Organizational policies should address all user interactions with sensitive data and reinforce the consequences of lost or compromised data. IT/OT asset management is critical to ensuring that the appropriate cyber hygiene controls are maintained across all assets in your organization, including medical device management."
            },
            {
              "text": "Our SRA documentation identifies and assesses potential threats and vulnerabilities (both technical and non-technical) to the confidentiality, integrity, and availability of all ePHI we create, receive, maintain, or transmit. Impact and likelihood ratings are assigned and risk ratings determined. This allows us to understand severity. We do not include corrective action plans.",
              "riskScore": 0,
              "education": "Corrective action plans should be developed as needed to mitigate identified security deficiencies according to which threats and vulnerabilities are most severe. Establish a data classification policy that categorizes data as, for example, Sensitive, Internal Use, or Public Use. Identify the types of records relevant to each category. Organizational policies should address all user interactions with sensitive data and reinforce the consequences of lost or compromised data. IT/OT asset management is critical to ensuring that the appropriate cyber hygiene controls are maintained across all assets in your organization, including medical device management."
            },
            {
              "text": "Our SRA documentation identifies and assesses potential threats and vulnerabilities but does not include impact and likelihood ratings, severity ratings, or corrective action plans.",
              "riskScore": 0,
              "education": "Threats and vulnerabilities should be documented and given impact and likelihood ratings. This will help determine severity and is the best way to safeguard and protect ePHI from potential threats and vulnerabilities. Corrective action plans should be developed as needed to mitigate identified security deficiencies according to which threats and vulnerabilities are most severe. Establish a data classification policy that categorizes data as, for example, Sensitive, Internal Use, or Public Use. Identify the types of records relevant to each category. Organizational policies should address all user interactions with sensitive data and reinforce the consequences of lost or compromised data. IT/OT asset management is critical to ensuring that the appropriate cyber hygiene controls are maintained across all assets in your organization, including medical device management."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Threats and vulnerabilities should be documented and given impact and likelihood ratings. This will help determine severity and is the best way to safeguard and protect ePHI from potential threats and vulnerabilities. Corrective action plans should be developed as needed to mitigate identified security deficiencies according to which threats and vulnerabilities are most severe. Establish a data classification policy that categorizes data as, for example, Sensitive, Internal Use, or Public Use. Identify the types of records relevant to each category. Organizational policies should address all user interactions with sensitive data and reinforce the consequences of lost or compromised data. IT/OT asset management is critical to ensuring that the appropriate cyber hygiene controls are maintained across all assets in your organization, including medical device management."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Threats and vulnerabilities should be documented and given impact and likelihood ratings. This will help determine severity and is the best way to safeguard and protect ePHI from potential threats and vulnerabilities. Corrective action plans should be developed as needed to mitigate identified security deficiencies according to which threats and vulnerabilities are most severe. Establish a data classification policy that categorizes data as, for example, Sensitive, Internal Use, or Public Use. Identify the types of records relevant to each category. Organizational policies should address all user interactions with sensitive data and reinforce the consequences of lost or compromised data. IT/OT asset management is critical to ensuring that the appropriate cyber hygiene controls are maintained across all assets in your organization, including medical device management."
            }
          ]
        },
        {
          "id": "7",
          "text": "Do you respond to the threats and vulnerabilities identified in your SRA?",
          "responses": [
            {
              "text": "Yes, we respond. We also maintain supporting documentation of our response.",
              "riskScore": 1,
              "education": "This is the most effective option. Threats and vulnerabilities should be documented within your SRA and given impact and likelihood ratings to determine severity. Safeguards protecting ePHI from these threats and vulnerabilities should be evaluated for effectiveness. Corrective action plans with plan of action milestones should be developed as needed to mitigate identified security deficiencies according to which threats and vulnerabilities are most severe. Risks should be formally deemed \"accepted\" only when appropriate. Conduct routine patching of security flaws in servers, applications (including web applications), and third-party software. Maintain software at least monthly, implementing patches distributed by the vendor community, if patching is not automatic."
            },
            {
              "text": "Yes, we respond, but we do not maintain documentation of our response.",
              "riskScore": 0,
              "education": "Threats and vulnerabilities should be documented within your SRA and given impact and likelihood ratings to determine severity. Safeguards protecting ePHI from these threats and vulnerabilities should be evaluated for effectiveness. Corrective action plans with plan of action milestones should be developed as needed to mitigate identified security deficiencies according to which threats and vulnerabilities are most severe. Risks should be formally deemed \"accepted\" only when appropriate. Conduct routine patching of security flaws in servers, applications (including web applications), and third-party software. Maintain software at least monthly, implementing patches distributed by the vendor community, if patching is not automatic."
            },
            {
              "text": "No, we don't have a process to respond to identified threats and vulnerabilities.",
              "riskScore": 0,
              "education": "Threats and vulnerabilities should be documented within your SRA and given impact and likelihood ratings to determine severity. Safeguards protecting ePHI from these threats and vulnerabilities should be evaluated for effectiveness. Corrective action plans with plan of action milestones should be developed as needed to mitigate identified security deficiencies according to which threats and vulnerabilities are most severe. Risks should be formally deemed \"accepted\" only when appropriate. Conduct routine patching of security flaws in servers, applications (including web applications), and third-party software. Maintain software at least monthly, implementing patches distributed by the vendor community, if patching is not automatic."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Threats and vulnerabilities should be documented within your SRA and given impact and likelihood ratings to determine severity. Safeguards protecting ePHI from these threats and vulnerabilities should be evaluated for effectiveness. Corrective action plans with plan of action milestones should be developed as needed to mitigate identified security deficiencies according to which threats and vulnerabilities are most severe. Risks should be formally deemed \"accepted\" only when appropriate. Conduct routine patching of security flaws in servers, applications (including web applications), and third-party software. Maintain software at least monthly, implementing patches distributed by the vendor community, if patching is not automatic."
            }
          ]
        },
        {
          "id": "8",
          "text": "Do you identify specific personnel to respond to and mitigate the threats and vulnerabilities found in your SRA?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Use internal or external experts to deploy security controls."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider identifying specific workforce members to respond to and mitigate all threats and vulnerabilities identified in your SRA. Use internal or external experts to deploy security controls."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider identifying specific workforce members to respond to and mitigate all threats and vulnerabilities identified in your SRA. Use internal or external experts to deploy security controls."
            }
          ]
        },
        {
          "id": "9",
          "text": "Do you communicate SRA results to personnel involved in responding to threats or vulnerabilities?",
          "responses": [
            {
              "text": "Yes. We have established policies and procedures for communicating SRA findings to staff to educate them about threats and vulnerabilities.",
              "riskScore": 1,
              "education": "This is the most effective option. You may not be able to implement effective safeguards to protect ePHI if you do not document and share the results of your SRA with the staff responsible for making risk management decisions, developing risk-related policies, and implementing risk mitigation safeguards for ePHI. Communicate to workforce members who review and sign off after reading policies over a specified timeframe. The goal is to establish a standard practice for workforce members to review applicable policies and attest to the review, and for the organization to monitor compliance with this standard."
            },
            {
              "text": "No. We do not regularly communicate SRA results to staff.",
              "riskScore": 0,
              "education": "You may not be able to implement effective safeguards to protect ePHI if you do not document and share the results of your SRA with the staff responsible for making risk management decisions, developing risk-related policies, and implementing risk mitigation safeguards for ePHI. Communicate to workforce members who review and sign off after reading policies over a specified timeframe. The goal is to establish a standard practice for workforce members to review applicable policies and attest to the review, and for the organization to monitor compliance with this standard."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "You may not be able to implement effective safeguards to protect ePHI if you do not document and share the results of your SRA with the staff responsible for making risk management decisions, developing risk-related policies, and implementing risk mitigation safeguards for ePHI. Communicate to workforce members who review and sign off after reading policies over a specified timeframe. The goal is to establish a standard practice for workforce members to review applicable policies and attest to the review, and for the organization to monitor compliance with this standard."
            }
          ]
        },
        {
          "id": "10",
          "text": "How do you communicate SRA results to personnel involved in responding to identified threats or vulnerabilities?",
          "responses": [
            {
              "text": "Written and verbal communication as well as coordinated corrective action planning.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Written results of the risk assessment should be communicated to the personnel responsible for responding to identified threats and vulnerabilities. The responsible persons should be involved in the creation of corrective action plans to mitigate threats and vulnerabilities for which they are responsible."
            },
            {
              "text": "Written communication only.",
              "riskScore": 0,
              "education": "Written results of your SRA should be communicated to the personnel responsible for responding to identified threats and vulnerabilities but also consider involving the personnel responsible for responding to identified threats and vulnerabilities in the creation of corrective action plans."
            },
            {
              "text": "Verbal communication only.",
              "riskScore": 0,
              "education": "Written results of the risk assessment should be communicated to workforce members who will be responsible for responding to identified threats and vulnerabilities after the completion of the risk assessment. The responsible team members responsible for responding to identified threats and vulnerabilities should be involved in the creation of corrective action plans to mitigate threats and vulnerabilities for which they are responsible."
            },
            {
              "text": "We do not communicate risk assessment results to workforce members.",
              "riskScore": 0,
              "education": "Written results of the risk assessment should be communicated to workforce members who will be responsible for responding to identified threats and vulnerabilities after the completion of the risk assessment. The responsible team members responsible for responding to identified threats and vulnerabilities should be involved in the creation of corrective action plans to mitigate threats and vulnerabilities for which they are responsible."
            }
          ]
        },
        {
          "id": "1",
          "text": "Inadequate risk awareness or failure to identify new weaknesses",
          "responses": [
            {
              "text": "Non-physical threat(s) such as data corruption or information disclosure, interruption of system function and business processes, and/or legislation or security breaches",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Physical threats such as unauthorized facility access, hardware or equipment malfunction, collisions, trip/fire hazards, and/or hazardous materials (chemicals, magnets, etc.)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Natural threat(s) such as damage from dust/particulates, extreme temperatures, severe weather events, and/or destruction from animals/insects",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Man-made threat(s) such as insider carelessness, theft/vandalism, terrorism/civil unrest, toxic emissions, or hackers/computer criminals",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Infrastructure threat(s) such as building/road hazards, power/telephone outages, water leakage (pipes, roof, sprinkler activation), unstable building conditions",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "2",
          "text": "Failure to remediate known risk(s)",
          "responses": [
            {
              "text": "Information disclosure (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Penalties from contractual non-compliance with third-party vendors",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disruption of business processes, information system function, and/or prolonged adversarial presence within information systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Data deletion or corruption of records",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Prolonged exposure to hacker, computer criminal, malicious code, or careless insider",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Corrective enforcement from regulatory agencies (e.g., HHS, OCR, FTC, CMS, State or Local jurisdictions)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Hardware/equipment malfunction",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "3",
          "text": "Failure to meet minimum regulatory requirements and security standards",
          "responses": [
            {
              "text": "Corrective enforcement from regulatory agencies (e.g., HHS, OCR, FTC, CMS, State or Local jurisdictions)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Damage to public reputation due to breach",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Failure to attain incentives or optimize value-based reimbursement",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Litigation from breach victims due to lack of reasonable and appropriate safeguards",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "4",
          "text": "Inadequate Asset Tracking",
          "responses": [
            {
              "text": "Information disclosure (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disruption of business processes, information system function, and/or prolonged adversarial presence within information systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized use of assets or changes to data within information systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized installation of software or applications",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Loss, theft, or disruption of assets",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Improper operation/configuration of assets",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "5",
          "text": "Unspecified workforce security responsibilities",
          "responses": [
            {
              "text": "Non-remediated weaknesses",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Prolonged duration of addressing non-remediated weaknesses",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Insider carelessness exposing ePHI or causing disruption to information systems and business processes",
              "riskScore": 0,
              "education": ""
            }
          ]
        }
      ]
    },
    {
      "id": "section_2",
      "title": "Section 2 - Security Policies",
      "questions": [
        {
          "id": "1",
          "text": "Do you maintain documentation of policies and procedures regarding risk assessment, risk management and information security activities?",
          "responses": [
            {
              "text": "Yes, we have a process by which assigned personnel develop, implement, review, and update security policies and procedures.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Establishing and implementing cybersecurity policies, procedures, and processes is one of the most effective means of preventing cyberattacks."
            },
            {
              "text": "Yes, we have some documentation for our information security and risk management activities, but not all of our policies and procedures are documented.",
              "riskScore": 0,
              "education": "You should document policies and procedures to ensure you consistently make informed decisions on the effective monitoring, identification, and mitigation of risks to ePHI. Establishing and implementing cybersecurity policies, procedures, and processes is one of the most effective means of preventing cyberattacks."
            },
            {
              "text": "No, we do not maintain documentation on our information security activities or risk management.",
              "riskScore": 0,
              "education": "You should document policies and procedures to ensure you consistently make informed decisions on the effective monitoring, identification, and mitigation of risks to ePHI. Establishing and implementing cybersecurity policies, procedures, and processes is one of the most effective means of preventing cyberattacks."
            }
          ]
        },
        {
          "id": "2",
          "text": "Do you review and update your security documentation, including policies and procedures?",
          "responses": [
            {
              "text": "Yes, we review and update our security documentation periodically and as necessary.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Review an appropriate number of policies over a specified timeframe. The goal is to establish a standard practice to review policies and to monitor compliance with this standard."
            },
            {
              "text": "Yes, we review and update our documentation periodically or as needed, but not both.",
              "riskScore": 0,
              "education": "You should implement a process to periodically review and update your security policies and procedures. This will help you safeguard your facilities, information systems, and ePHI. Review an appropriate number of policies over a specified timeframe. The goal is to establish a standard practice to review policies and to monitor compliance with this standard."
            },
            {
              "text": "Yes, we review our security documentation but we have not updated our documentation.",
              "riskScore": 0,
              "education": "You should implement a process to periodically review and update your security policies and procedures. This will help you safeguard your facilities, information systems, and ePHI. Review an appropriate number of policies over a specified timeframe. The goal is to establish a standard practice to review policies and to monitor compliance with this standard."
            },
            {
              "text": "No, we have never updated our documentation",
              "riskScore": 0,
              "education": "You should implement a process to periodically review and update your security policies and procedures. This will help you safeguard your facilities, information systems, and ePHI. Review an appropriate number of policies over a specified timeframe. The goal is to establish a standard practice to review policies and to monitor compliance with this standard."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "You should implement a process to periodically review and update your security policies and procedures. This will help you safeguard your facilities, information systems, and ePHI. Review an appropriate number of policies over a specified timeframe. The goal is to establish a standard practice to review policies and to monitor compliance with this standard."
            }
          ]
        },
        {
          "id": "3",
          "text": "How do you update your security program documentation, including policies and procedures?",
          "responses": [
            {
              "text": "We have a periodic review of information security policies that formally evaluates their effectiveness. Policies and procedures are updated as needed.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. With clearly articulated cybersecurity policies, your employees, contractors, and third-party vendors know which data, applications, systems, and devices they are authorized to access and the consequences of unauthorized access attempts."
            },
            {
              "text": "We update policies and procedures ad hoc, for example when an immediate need prompts the change.",
              "riskScore": 0,
              "education": "You should conduct periodic reviews of information security policies and update them as needed. With clearly articulated cybersecurity policies, your employees, contractors, and third-party vendors know which data, applications, systems, and devices they are authorized to access and the consequences of unauthorized access attempts."
            },
            {
              "text": "We do not have a process for updating our security documentation.",
              "riskScore": 0,
              "education": "You should conduct periodic reviews of information security policies and update them as needed. With clearly articulated cybersecurity policies, your employees, contractors, and third-party vendors know which data, applications, systems, and devices they are authorized to access and the consequences of unauthorized access attempts."
            }
          ]
        },
        {
          "id": "4",
          "text": "Is the security officer involved in all security policy and procedure updates?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "You should have a designated security officer and any/all policy or procedure updates should be reported to the security officer. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "You should have a designated security officer and any/all policy or procedure updates should be reported to the security officer. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "You should have a designated security officer and any/all policy or procedure updates should be reported to the security officer. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            }
          ]
        },
        {
          "id": "5",
          "text": "How does documentation for your risk management and security procedures compare to your actual business practices?",
          "responses": [
            {
              "text": "Our risk management and security documentation completely and accurately reflects our actual business practices.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. With clearly articulated cybersecurity policies, your employees, contractors, and third-party vendors know which data, applications, systems, and devices they are authorized to access and the consequences of unauthorized access attempts."
            },
            {
              "text": "Our risk management and security documentation somewhat accurately reflects our business practices.",
              "riskScore": 0,
              "education": "Risk management and security documentation should accurately reflect business practices. Ensure that your security documentation represents your actual security practices. With clearly articulated cybersecurity policies, your employees, contractors, and third-party vendors know which data, applications, systems, and devices they are authorized to access and the consequences of unauthorized access attempts."
            },
            {
              "text": "Our risk management and security documentation does not accurately reflect our business practices.",
              "riskScore": 0,
              "education": "Risk management and security documentation should accurately reflect business practices. Ensure that your security documentation represents your actual security practices. With clearly articulated cybersecurity policies, your employees, contractors, and third-party vendors know which data, applications, systems, and devices they are authorized to access and the consequences of unauthorized access attempts."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Considering reviewing how your risk management documentation and security procedures compare to your business practices. Risk management and security documentation should accurately reflect business practices. Ensure that your security documentation represents your actual security practices. With clearly articulated cybersecurity policies, your employees, contractors, and third-party vendors know which data, applications, systems, and devices they are authorized to access and the consequences of unauthorized access attempts."
            }
          ]
        },
        {
          "id": "6",
          "text": "How long are information security management and risk management documents kept?",
          "responses": [
            {
              "text": "We maintain documents for at least six (6) years from the date of their creation or when they were last in effect, whichever is longer. These documents are maintained and backed up.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. The federal requirement is six (6) years retention of documentation, but your state or jurisdiction may have additional requirements."
            },
            {
              "text": "We maintain documents for at least six (6) years from the date of their creation or when they were last in effect, whichever is longer. These documents are not backed up.",
              "riskScore": 0,
              "education": "The federal requirement is six (6) years retention of documentation, but your state or jurisdiction may have additional requirements. Investigate the requirements for your state. Consider backing up information security and risk management documents."
            },
            {
              "text": "We do not have a set amount of time to keep our documentation.",
              "riskScore": 0,
              "education": "Ensure your policies, procedures, and other security program documentation are retained for at least six (6) years from the date when it was created or last in effect, whichever is longer. Your state or jurisdiction may have additional requirements. Consider backing up these documents."
            },
            {
              "text": "We do not maintain documents regarding security and risk management.",
              "riskScore": 0,
              "education": "Ensure your policies, procedures, and other security program documentation are retained for at least six (6) years from the date when it was created or last in effect, whichever is longer. Your state or jurisdiction may have additional requirements. Consider backing up these documents."
            }
          ]
        },
        {
          "id": "7",
          "text": "Do you make sure that information security and risk management documentation is available to those who need it?",
          "responses": [
            {
              "text": "Yes. Documentation is made available to appropriate workforce members in physical and/or electronic formats (for example, our practice's shared drive or intranet).",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. With clearly articulated cybersecurity policies, your employees, contractors, and third-party vendors know which data, applications, systems, and devices they are authorized to access and the consequences of unauthorized access attempts."
            },
            {
              "text": "Documentation is reviewed with appropriate workforce members upon initial orientation to the practice, but is not reviewed on a periodic basis or available in physical and/or electronic format unless requested.",
              "riskScore": 0,
              "education": "Documentation should be available to workforce members who need it to perform the security responsibilities associated with their role and reviewed on a periodic basis. Consider making the documentation available in writing, on a local shared drive, or other accessible place. With clearly articulated cybersecurity policies, your employees, contractors, and third-party vendors know which data, applications, systems, and devices they are authorized to access and the consequences of unauthorized access attempts."
            },
            {
              "text": "No. We do not have a process to ensure documentation is available to appropriate workforce members who need it.",
              "riskScore": 0,
              "education": "Documentation should be available to workforce members who need it to perform the security responsibilities associated with their role and reviewed on a periodic basis. Consider making the documentation available in writing, on a local shared drive, or other accessible place. With clearly articulated cybersecurity policies, your employees, contractors, and third-party vendors know which data, applications, systems, and devices they are authorized to access and the consequences of unauthorized access attempts."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Documentation should be available to workforce members who need it to perform the security responsibilities associated with their role and reviewed on a periodic basis. Consider making the documentation available in writing, on a local shared drive, or other accessible place. With clearly articulated cybersecurity policies, your employees, contractors, and third-party vendors know which data, applications, systems, and devices they are authorized to access and the consequences of unauthorized access attempts."
            }
          ]
        },
        {
          "id": "8",
          "text": "How do you ensure that security and risk management documentation is available to those who need it?",
          "responses": [
            {
              "text": "Appropriate workforce members receive instructions on our information security documentation and where to find it as part of their periodic privacy and security training. Documentation is securely made available to workforce members in physical or electronic formats.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Policies are established first and are then supplemented with procedures that enable the policies to be implemented. Policies describe what is expected, and procedures describe how the expectations are met."
            },
            {
              "text": "Documentation is reviewed with appropriate workforce members upon initial orientation to the practice. Documentation is securely made available to appropriate workforce members in physical or electronic formats and they are verbally instructed as to where it is.",
              "riskScore": 0,
              "education": "Review your information security documentation with your appropriate workforce members upon hire and on an ongoing, periodic basis. Make sure workforce members know where to find the documentation for ongoing review. Policies are established first and are then supplemented with procedures that enable the policies to be implemented. Policies describe what is expected, and procedures describe how the expectations are met."
            },
            {
              "text": "Documentation is securely made available to appropriate workforce members in physical or electronic formats and they are verbally instructed as to where it is.",
              "riskScore": 0,
              "education": "Review your information security documentation with your appropriate workforce members upon hire and on an ongoing, periodic basis. Make sure workforce members know where to find the documentation for ongoing review. Policies are established first and are then supplemented with procedures that enable the policies to be implemented. Policies describe what is expected, and procedures describe how the expectations are met."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Review your information security documentation with your appropriate workforce members upon hire and on an ongoing, periodic basis. Make sure workforce members know where to find the documentation for ongoing review. Policies are established first and are then supplemented with procedures that enable the policies to be implemented. Policies describe what is expected, and procedures describe how the expectations are met."
            }
          ]
        },
        {
          "id": "1",
          "text": "Failure to update Policies & Procedures",
          "responses": [
            {
              "text": "Fines/penalties from mandated regulatory requirements",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unstructured guidance for daily tasks and duties within workforce",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "2",
          "text": "Failure to share security procedure information with appropriate parties",
          "responses": [
            {
              "text": "Unauthorized access to ePHI or sensitive information permitted",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disruption of information system function",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "ePHI accessed by unauthorized entities",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Insider carelessness causing disruption",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Insider carelessness exposing ePHI",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "3",
          "text": "Inconsistent/unclear risk management documentation",
          "responses": [
            {
              "text": "Unclear security coordination across workforce",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unstructured guidance for daily tasks and duties",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "4",
          "text": "No risk management documentation (or low retention of documentation)",
          "responses": [
            {
              "text": "Fines/penalties from regulatory enforcement",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Inability of workforce to perform proper security and privacy-related tasks or access procedural documents",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unstructured workforce coordination of risk management procedures",
              "riskScore": 0,
              "education": ""
            }
          ]
        }
      ]
    },
    {
      "id": "section_3",
      "title": "Section 3 - Security & Workforce",
      "questions": [
        {
          "id": "1",
          "text": "Who within your practice is responsible for developing and implementing information security policies and procedures?",
          "responses": [
            {
              "text": "The security officer is a member of the workforce identified by name in policy documents.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            },
            {
              "text": "The role of security officer is described in our policy documentation, but the person who occupies that role is not named.",
              "riskScore": 0,
              "education": "You should have a qualified and capable person appointed to the responsibility of security officer. Having a central point of contact helps ensure that information security practices are coordinated, consistent, and that the organization can be held accountable. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            },
            {
              "text": "A member of our workforce.",
              "riskScore": 0,
              "education": "You should have a qualified and capable person appointed to the responsibility of security officer. Having a central point of contact helps ensure that information security practices are coordinated, consistent, and that the organization can be held accountable. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            },
            {
              "text": "The security officer is not formally named or otherwise identified in policy.",
              "riskScore": 0,
              "education": "You should have a qualified and capable person appointed to the responsibility of security officer. Having a central point of contact helps ensure that information security practices are coordinated, consistent, and that the organization can be held accountable. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "You should have a qualified and capable person appointed to the responsibility of security officer. Having a central point of contact helps ensure that information security practices are coordinated, consistent, and that the organization can be held accountable. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            }
          ]
        },
        {
          "id": "2",
          "text": "Do you identify and document the role and responsibilities of the security officer?",
          "responses": [
            {
              "text": "Yes. The security officer is identified by role and this is documented in our practice's information security policies, which describes the role's responsibilities.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            },
            {
              "text": "Yes. Our practice has a security officer, but there is no formal documentation of the position or the responsibilities.",
              "riskScore": 0,
              "education": "You should document who is responsible for coordinating information security activities. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            },
            {
              "text": "No. We have not identified the role of the security officer.",
              "riskScore": 0,
              "education": "You should document who is responsible for coordinating information security activities. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            }
          ]
        },
        {
          "id": "3",
          "text": "Is your security officer qualified for the position?",
          "responses": [
            {
              "text": "Yes. The security officer is an assigned member of the workforce familiar with security and has the authority to design, implement, and enforce security policies and procedures.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "No. The security officer does not have the ability to design, implement, and enforce security policies and procedures.",
              "riskScore": 0,
              "education": "Assign responsibility of the security officer to a member of the workforce with the ability to ensure security policies are effective and followed consistently."
            },
            {
              "text": "I don't know. We have not considered what qualifications would be appropriate for the security officer.",
              "riskScore": 0,
              "education": "Assign responsibility of the security officer to a member of the workforce with the ability to ensure security policies are effective and followed consistently."
            }
          ]
        },
        {
          "id": "4",
          "text": "Do workforce members know who the security officer is?",
          "responses": [
            {
              "text": "Yes. Workforce members are aware of who our security officer is.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "No. Not all workforce members know who our security officer is.",
              "riskScore": 0,
              "education": "If your workforce members do not know the name and contact information of the security officer, they may not be able to raise security concerns or execute mitigating actions when there are security problems."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "If your workforce members do not know the name and contact information of the security officer, they may not be able to raise security concerns or execute mitigating actions when there are security problems."
            }
          ]
        },
        {
          "id": "5",
          "text": "Do workforce members know how and when to contact the security officer?",
          "responses": [
            {
              "text": "Workforce members are made aware of the identity of the security officer and reasons for contacting the security officer as part of their orientation to the practice (upon hire) as well as periodic reminders of our internal policies and procedures (e.g., periodic review).",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "Information about who the security officer is and when they should be contacted is verbally communicated to workforce members, but this is not a formal process.",
              "riskScore": 0,
              "education": "If your workforce members do not know the contact information and availability of the security officer, they may not be able to execute immediate and appropriate mitigating actions when there are security problems."
            },
            {
              "text": "We do not have a process to inform workforce members about the identity of the security officer or when the security officer needs to be contacted.",
              "riskScore": 0,
              "education": "If your workforce members do not know the contact information and availability of the security officer, they may not be able to execute immediate and appropriate mitigating actions when there are security problems."
            }
          ]
        },
        {
          "id": "6",
          "text": "Who do people contact for security considerations if there is no security officer available or identified within the organization?",
          "responses": [
            {
              "text": "The practice manager.",
              "riskScore": 1,
              "education": "You should identify a member of your workforce to serve as the security official and who will be responsible for the development and implementation of security policies and procedures. If no security officer is available, be sure to outline where and how workforce members should communicate security concerns. Having this identified and outlined in procedures will allow your workforce to be able to execute immediate and appropriate mitigating actions when there are security problems."
            },
            {
              "text": "Information Technology (IT) Manager.",
              "riskScore": 1,
              "education": "You should identify a member of your workforce to serve as the security official and who will be responsible for the development and implementation of security policies and procedures. If no security officer is available, be sure to outline where and how workforce members should communicate security concerns. Having this identified and outlined in procedures will allow your workforce to be able to execute immediate and appropriate mitigating actions when there are security problems."
            },
            {
              "text": "Lead physician in the practice.",
              "riskScore": 1,
              "education": "You should identify a member of your workforce to serve as the security official and who will be responsible for the development and implementation of security policies and procedures. If no security officer is available, be sure to outline where and how workforce members should communicate security concerns. Having this identified and outlined in procedures will allow your workforce to be able to execute immediate and appropriate mitigating actions when there are security problems."
            },
            {
              "text": "Lead nurse in practice.",
              "riskScore": 1,
              "education": "You should identify a member of your workforce to serve as the security official and who will be responsible for the development and implementation of security policies and procedures. If no security officer is available, be sure to outline where and how workforce members should communicate security concerns. Having this identified and outlined in procedures will allow your workforce to be able to execute immediate and appropriate mitigating actions when there are security problems."
            },
            {
              "text": "Lead consultant for the practice.",
              "riskScore": 1,
              "education": "You should identify a member of your workforce to serve as the security official and who will be responsible for the development and implementation of security policies and procedures. If no security officer is available, be sure to outline where and how workforce members should communicate security concerns. Having this identified and outlined in procedures will allow your workforce to be able to execute immediate and appropriate mitigating actions when there are security problems."
            },
            {
              "text": "Administrative support for the practice.",
              "riskScore": 1,
              "education": "You should identify a member of your workforce to serve as the security official and who will be responsible for the development and implementation of security policies and procedures. If no security officer is available, be sure to outline where and how workforce members should communicate security concerns. Having this identified and outlined in procedures will allow your workforce to be able to execute immediate and appropriate mitigating actions when there are security problems."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "You should identify a member of your workforce to serve as the security official and who will be responsible for the development and implementation of security policies and procedures. If no security officer is available, be sure to outline where and how workforce members should communicate security concerns. Having this identified and outlined in procedures will allow your workforce to be able to execute immediate and appropriate mitigating actions when there are security problems."
            }
          ]
        },
        {
          "id": "7",
          "text": "How are staff roles and job duties defined with respect to ePHI access?",
          "responses": [
            {
              "text": "We have written job descriptions, roles, and required qualifications documented for all workforce members with access to ePHI.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Health care organizations of all sizes need to clearly identify all users and maintain audit trails that monitor each user's access to data, applications, systems, and endpoints."
            },
            {
              "text": "We have written job titles, but no written roles or responsibilities for workforce members with access to ePHI.",
              "riskScore": 0,
              "education": "Consider implementing procedures for the authorization and/or supervision of workforce members who work with ePHI or in locations where it might be accessed. If such procedures are determined to not be reasonable and appropriate, document the reason why and what is being done to compensate for these lack of procedures. Health care organizations of all sizes need to clearly identify all users and maintain audit trails that monitor each user's access to data, applications, systems, and endpoints."
            },
            {
              "text": "We do not have written job roles or responsibilities for workforce members with access to ePHI.",
              "riskScore": 0,
              "education": "Consider implementing procedures for the authorization and/or supervision of workforce members who work with ePHI or in locations where it might be accessed. If such procedures are determined to not be reasonable and appropriate, document the reason why and what is being done to compensate for these lack of procedures. Health care organizations of all sizes need to clearly identify all users and maintain audit trails that monitor each user's access to data, applications, systems, and endpoints."
            }
          ]
        },
        {
          "id": "8",
          "text": "Do you screen your workforce members (e.g., staff, volunteers, interns) with tools like credential verification or background checks to verify trustworthiness?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Unqualified or untrustworthy users could access your ePHI if policies and procedures do not require screening workforce members prior to enabling access to facilities, information systems, and ePHI."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Unqualified or untrustworthy users could access your ePHI if policies and procedures do not require screening workforce members prior to enabling access to facilities, information systems, and ePHI."
            }
          ]
        },
        {
          "id": "9",
          "text": "How are your workforce members screened to verify trustworthiness?",
          "responses": [
            {
              "text": "Professional references are collected and verified. Criminal background checks are performed in addition to verifying licenses, credentials, certifications, and good standing with relevant agencies (e.g., check workforce members against the List of Excluded Individuals and Entities).",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "Professional references are collected and verified along with licenses, credentials, and certifications. We do not perform criminal background checks.",
              "riskScore": 0,
              "education": "Consider which methods of personnel screening are reasonable and appropriate for your organization in order to verify the trustworthiness of workforce members who will access ePHI."
            },
            {
              "text": "We only collect professional references.",
              "riskScore": 0,
              "education": "Consider which methods of personnel screening are reasonable and appropriate for your organization in order to verify the trustworthiness of workforce members who will access ePHI."
            },
            {
              "text": "We hire through external sources (local school externship or temp agency), and assume their vetting process is sufficient.",
              "riskScore": 0,
              "education": "Consider which methods of personnel screening are reasonable and appropriate for your organization in order to verify the trustworthiness of workforce members who will access ePHI."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Consider which methods of personnel screening are reasonable and appropriate for your organization in order to verify the trustworthiness of workforce members who will access ePHI."
            }
          ]
        },
        {
          "id": "10",
          "text": "Do you ensure that all workforce members (including management) are given security training?",
          "responses": [
            {
              "text": "Yes, we ensure all workforce members complete security training on a periodic basis.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Establish and maintain a training program for your workforce that includes a section on phishing attacks. All users in your organization should be able to recognize phishing techniques. Train your workforce to comply with organizational procedures and ONC guidance when transmitting PHI through e-mail. Train staff never to back up data on unapproved storage devices or personal cloud services. Train and regularly remind users that they must never share their passwords."
            },
            {
              "text": "Yes, we ensure all workforce members complete security training, but this not done periodically.",
              "riskScore": 0,
              "education": "Provide periodic security trainings to all workforce members. The standard states that periodic security trainings be completed and documented for all workforce members, and the documentation is reviewed by your practice's security officer. Establish and maintain a training program for your workforce that includes a section on phishing attacks. All users in your organization should be able to recognize phishing techniques. Train your workforce to comply with organizational procedures and ONC guidance when transmitting PHI through e-mail. Train staff never to back up data on unapproved storage devices or personal cloud services. Train and regularly remind users that they must never share their passwords."
            },
            {
              "text": "No, we do not ensure that all workforce members have completed security training or that security training is completed on a periodic basis.",
              "riskScore": 0,
              "education": "Provide periodic security trainings to all workforce members. The standard states that periodic security trainings be completed and documented for all workforce members, and the documentation is reviewed by your practice's security officer. Establish and maintain a training program for your workforce that includes a section on phishing attacks. All users in your organization should be able to recognize phishing techniques. Train your workforce to comply with organizational procedures and ONC guidance when transmitting PHI through e-mail. Train staff never to back up data on unapproved storage devices or personal cloud services. Train and regularly remind users that they must never share their passwords."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Provide periodic security trainings to all workforce members. The standard states that periodic security trainings be completed and documented for all workforce members, and the documentation is reviewed by your practice's security officer. Establish and maintain a training program for your workforce that includes a section on phishing attacks. All users in your organization should be able to recognize phishing techniques. Train your workforce to comply with organizational procedures and ONC guidance when transmitting PHI through e-mail. Train staff never to back up data on unapproved storage devices or personal cloud services. Train and regularly remind users that they must never share their passwords."
            }
          ]
        },
        {
          "id": "11",
          "text": "How do you ensure that all workforce members are given security training?",
          "responses": [
            {
              "text": "We keep a list of workforce members who have completed security training. Trainings are provided upon hire and periodically thereafter. The list is reviewed and verified by the security officer.",
              "riskScore": 1,
              "education": "This is an effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Train personnel to comply with organizational policies. At minimum, provide annual training on the most important policy considerations, such as the use of encryption, strong passwords, and PHI transmission restrictions. Provide staff with training on and awareness of phishing e-mails. Describe the mechanisms by which the workforce will be trained on cybersecurity practices, threats, and mitigations."
            },
            {
              "text": "Our security training is provided by a vendor who keeps record of the trainings completed. The records are reviewed and verified by the security officer.",
              "riskScore": 1,
              "education": "This is an effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Train personnel to comply with organizational policies. At minimum, provide annual training on the most important policy considerations, such as the use of encryption, strong passwords, and PHI transmission restrictions. Provide staff with training on and awareness of phishing e-mails. Describe the mechanisms by which the workforce will be trained on cybersecurity practices, threats, and mitigations."
            },
            {
              "text": "Documentation of security training is maintained in the workforce members' personnel file, but a single comprehensive record is not kept.",
              "riskScore": 0,
              "education": "Provide training periodically and maintain a comprehensive record of all personnel who have completed training. Have the security officer review the list. Train personnel to comply with organizational policies. At minimum, provide annual training on the most important policy considerations, such as the use of encryption, strong passwords, and PHI transmission restrictions. Provide staff with training on and awareness of phishing e-mails. Describe the mechanisms by which the workforce will be trained on cybersecurity practices, threats, and mitigations."
            },
            {
              "text": "We do not maintain records of privacy and security training for our workforce members.",
              "riskScore": 0,
              "education": "Provide training periodically and maintain a comprehensive record of all personnel who have completed training. Have the security officer review the list. Train personnel to comply with organizational policies. At minimum, provide annual training on the most important policy considerations, such as the use of encryption, strong passwords, and PHI transmission restrictions. Provide staff with training on and awareness of phishing e-mails. Describe the mechanisms by which the workforce will be trained on cybersecurity practices, threats, and mitigations."
            }
          ]
        },
        {
          "id": "12",
          "text": "How long are records of workforce member security training kept?",
          "responses": [
            {
              "text": "Records documenting the completion of required security trainings are kept for all workforce members (including management) and retained for at least six (6) years after completion of the training.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "Records documenting the completion of required security trainings are kept for all workforce members. Records are only retained for less than six (6) years.",
              "riskScore": 0,
              "education": "Records documenting the completion of security trainings for all workforce members (including management) should be kept for a minimum of six (6) years. Your state or jurisdiction may have additional requirements beyond six (6) year retention."
            },
            {
              "text": "Records documenting the completion of required security training are kept for all workforce members. Records are only kept for the year in which training was completed.",
              "riskScore": 0,
              "education": "Records documenting the completion of security trainings for all workforce members (including management) should be kept for a minimum of six (6) years. Your state or jurisdiction may have additional requirements beyond six (6) year retention."
            }
          ]
        },
        {
          "id": "13",
          "text": "Are procedures in place for monitoring log-in attempts and reporting discrepancies?",
          "responses": [
            {
              "text": "Yes, these procedures identify workforce members' roles and responsibilities, log-in monitoring procedure, how to identify a log-in discrepancy and how to respond to an identified discrepancy.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Implement access management procedures to track and monitor user access to computers and programs."
            },
            {
              "text": "Yes, we have procedures, but these do not include all of the elements listed above.",
              "riskScore": 0,
              "education": "Consider revising your procedures to include roles and responsibilities, how to identify a log-in discrepancy, and how to respond to an identified discrepancy. If doing so is determined to not be reasonable and appropriate, document the reason why and what compensating control takes its place. Implement access management procedures to track and monitor user access to computers and programs."
            },
            {
              "text": "Log-in monitoring tools are available but we do not actively utilize them.",
              "riskScore": 0,
              "education": "Consider revising your procedures to include roles and responsibilities, how to identify a log-in discrepancy, and how to respond to an identified discrepancy. If doing so is determined to not be reasonable and appropriate, document the reason why and what compensating control takes its place. Implement access management procedures to track and monitor user access to computers and programs."
            },
            {
              "text": "No, our privacy and security procedures do not include log-in monitoring.",
              "riskScore": 0,
              "education": "Consider revising your procedures to include roles and responsibilities, how to identify a log-in discrepancy, and how to respond to an identified discrepancy. If doing so is determined to not be reasonable and appropriate, document the reason why and what compensating control takes its place. Implement access management procedures to track and monitor user access to computers and programs."
            }
          ]
        },
        {
          "id": "14",
          "text": "Is up-to-date malware protection included in your policies and procedures?",
          "responses": [
            {
              "text": "Yes. Software protection is included in our procedures. This includes a review of our procedures for guarding against malware, and the mechanisms in place for protection, and how procedures for workforce members to follow can help to detect and report malicious software.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Anti-malware software is readily available at low cost and is effective at protecting endpoints from computer viruses, malware, spam, and ransomware threats. Each endpoint in your organization should be equipped with malware protection software that is configured to update automatically. For medical devices, the medical device manufacturer should directly support anti-malware software, or it should be cleared for operation by the manufacturer. Ensure that malware protection is enabled. If anti-malware cannot be implemented, compensating controls should enforce a detection scan whenever the device is serviced prior to reconnecting to the device network."
            },
            {
              "text": "Yes. Our security procedures include a review of our practice's procedure for guarding against malicious software, but does not cover how workforce members can detect and report malicious software or the protection mechanisms and system capabilities in place for malware protection.",
              "riskScore": 0,
              "education": "Consider including software protection in your procedures, such as: 1. What protection mechanisms and system capabilities are in place for protection against malicious software, 2. Workforce members' roles and responsibilities in malicious software protection procedures, 3. Steps to protect against and detect malicious software, and 4. Actions on how to respond to malicious software infections. Anti-malware software is readily available at low cost and is effective at protecting endpoints from computer viruses, malware, spam, and ransomware threats. Each endpoint in your organization should be equipped with malware protection software that is configured to update automatically. For medical devices, the medical device manufacturer should directly support anti-malware software, or it should be cleared for operation by the manufacturer. Ensure that malware protection is enabled. If anti-malware cannot be implemented, compensating controls should enforce a detection scan whenever the device is serviced prior to reconnecting to the device network."
            },
            {
              "text": "Protection from malicious software tools are available, but these are not included in our security procedures.",
              "riskScore": 0,
              "education": "Consider including software protection in your procedures, such as: 1. What protection mechanisms and system capabilities are in place for protection against malicious software, 2. Workforce members' roles and responsibilities in malicious software protection procedures, 3. Steps to protect against and detect malicious software, and 4. Actions on how to respond to malicious software infections. Anti-malware software is readily available at low cost and is effective at protecting endpoints from computer viruses, malware, spam, and ransomware threats. Each endpoint in your organization should be equipped with malware protection software that is configured to update automatically. For medical devices, the medical device manufacturer should directly support anti-malware software, or it should be cleared for operation by the manufacturer. Ensure that malware protection is enabled. If anti-malware cannot be implemented, compensating controls should enforce a detection scan whenever the device is serviced prior to reconnecting to the device network."
            },
            {
              "text": "No, protection from malicious software is not included in our security procedures.",
              "riskScore": 0,
              "education": "Consider including software protection in your procedures, such as: 1. What protection mechanisms and system capabilities are in place for protection against malicious software, 2. Workforce members' roles and responsibilities in malicious software protection procedures, 3. Steps to protect against and detect malicious software, and 4. Actions on how to respond to malicious software infections. Anti-malware software is readily available at low cost and is effective at protecting endpoints from computer viruses, malware, spam, and ransomware threats. Each endpoint in your organization should be equipped with malware protection software that is configured to update automatically. For medical devices, the medical device manufacturer should directly support anti-malware software, or it should be cleared for operation by the manufacturer. Ensure that malware protection is enabled. If anti-malware cannot be implemented, compensating controls should enforce a detection scan whenever the device is serviced prior to reconnecting to the device network."
            }
          ]
        },
        {
          "id": "15",
          "text": "What password security elements are covered in your security training?",
          "responses": [
            {
              "text": "Our security procedures include what our workforce roles/responsibilities are in password security, how to safeguard passwords, how to respond to a compromised password, and how to properly change a password using various password characteristics (e.g., many characters long, easy to remember, avoiding easy to guess phrases).",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. To stay current with best practices on security procedures consider enforcing password security measures consistent with guidance in NIST SP 800-63-3. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook). For devices that are accessed off site, leverage technologies that use multi-factor authentication (MFA) before permitting users to access data or applications on the device. Logins that use only a username and password are often compromised through phishing e-mails. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            },
            {
              "text": "Our security procedures include some but not all of the items noted above.",
              "riskScore": 0,
              "education": "Consider enforcing password security measures consistent with guidance in NIST SP 800-63-3 as part of your security training. If this is not determined to be reasonable and appropriate, document the reason why along with your compensating control. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook). For devices that are accessed off site, leverage technologies that use multi-factor authentication (MFA) before permitting users to access data or applications on the device. Logins that use only a username and password are often compromised through phishing e-mails. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            },
            {
              "text": "Password security is not covered in our security procedures.",
              "riskScore": 0,
              "education": "Consider enforcing password security measures consistent with guidance in NIST SP 800-63-3 as part of your security training. If this is not determined to be reasonable and appropriate, document the reason why along with your compensating control. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook). For devices that are accessed off site, leverage technologies that use multi-factor authentication (MFA) before permitting users to access data or applications on the device. Logins that use only a username and password are often compromised through phishing e-mails. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Consider enforcing password security measures consistent with guidance in NIST SP 800-63-3 as part of your security training. If this is not determined to be reasonable and appropriate, document the reason why along with your compensating control. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook). For devices that are accessed off site, leverage technologies that use multi-factor authentication (MFA) before permitting users to access data or applications on the device. Logins that use only a username and password are often compromised through phishing e-mails. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider enforcing password security measures consistent with guidance in NIST SP 800-63-3 as part of your security training. If this is not determined to be reasonable and appropriate, document the reason why along with your compensating control. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook). For devices that are accessed off site, leverage technologies that use multi-factor authentication (MFA) before permitting users to access data or applications on the device. Logins that use only a username and password are often compromised through phishing e-mails. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            }
          ]
        },
        {
          "id": "16",
          "text": "Do you ensure workforce members maintain ongoing awareness of security requirements?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Establish and maintain a training program for your workforce that includes a section on phishing attacks. All users in your organization should be able to recognize phishing techniques. Train your workforce to comply with organizational procedures and ONC guidance when transmitting PHI through e-mail. Train staff never to back up data on uncontrolled storage devices or personal cloud services."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider securing your workforce with formal, regular trainings as well as periodic reminders. If these steps are not determined to be reasonable and appropriate, document the reason why along with your compensating control. Establish and maintain a training program for your workforce that includes a section on phishing attacks. All users in your organization should be able to recognize phishing techniques. Train your workforce to comply with organizational procedures and ONC guidance when transmitting PHI through e-mail. Train staff never to back up data on uncontrolled storage devices or personal cloud services."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider securing your workforce with formal, regular trainings as well as periodic reminders. If these steps are not determined to be reasonable and appropriate, document the reason why along with your compensating control. Establish and maintain a training program for your workforce that includes a section on phishing attacks. All users in your organization should be able to recognize phishing techniques. Train your workforce to comply with organizational procedures and ONC guidance when transmitting PHI through e-mail. Train staff never to back up data on uncontrolled storage devices or personal cloud services."
            }
          ]
        },
        {
          "id": "17",
          "text": "How does your practice ensure workforce members maintain ongoing awareness of security requirements?",
          "responses": [
            {
              "text": "Formal trainings and periodic security reminders",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Provide staff with training on and awareness of phishing e-mails. Train personnel to comply with organizational policies. At minimum, provide annual training on the most important policy considerations, such as the use of encryption, strong passwords, and PHI transmission restrictions."
            },
            {
              "text": "Either formal trainings or periodic security reminders, but not both.",
              "riskScore": 0,
              "education": "Consider securing your workforce with formal, regular trainings as well as periodic reminders. If these steps are not determined to be reasonable and appropriate, document the reason why along with your compensating control. Provide staff with training on and awareness of phishing e-mails. Train personnel to comply with organizational policies. At minimum, provide annual training on the most important policy considerations, such as the use of encryption, strong passwords, and PHI transmission restrictions."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider securing your workforce with formal, regular trainings as well as periodic reminders. If these steps are not determined to be reasonable and appropriate, document the reason why along with your compensating control. Provide staff with training on and awareness of phishing e-mails. Train personnel to comply with organizational policies. At minimum, provide annual training on the most important policy considerations, such as the use of encryption, strong passwords, and PHI transmission restrictions."
            }
          ]
        },
        {
          "id": "18",
          "text": "Do you have a sanction policy to enforce security procedures?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider implementing a sanction policy. It is required that your practice be able to apply appropriate sanctions against workforce members who fail to comply with your practice's security policies and procedures."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider looking into whether your practice has a sanction policy. It is required that your practice be able to apply appropriate sanctions against workforce members who fail to comply with your practice's security policies and procedures."
            }
          ]
        },
        {
          "id": "19",
          "text": "What is included in your sanction policy to hold personnel accountable if they do not follow your security policies and procedures?",
          "responses": [
            {
              "text": "Formal written documentation of the sanction and the reason for the sanction.",
              "riskScore": 0,
              "education": "Consider which sanction policies and procedures are reasonable and appropriate for your organization in order to hold personnel accountable if they do not follow your security policies and procedures."
            },
            {
              "text": "A formal corrective action plan.",
              "riskScore": 0,
              "education": "Consider which sanction policies and procedures are reasonable and appropriate for your organization in order to hold personnel accountable if they do not follow your security policies and procedures."
            },
            {
              "text": "Identification of the sanctions applied to compliance failures.",
              "riskScore": 0,
              "education": "Consider which sanction policies and procedures are reasonable and appropriate for your organization in order to hold personnel accountable if they do not follow your security policies and procedures."
            },
            {
              "text": "Training to mitigate repeat offenses.",
              "riskScore": 0,
              "education": "Consider which sanction policies and procedures are reasonable and appropriate for your organization in order to hold personnel accountable if they do not follow your security policies and procedures."
            },
            {
              "text": "Documentation of the sanction outcome.",
              "riskScore": 0,
              "education": "Consider which sanction policies and procedures are reasonable and appropriate for your organization in order to hold personnel accountable if they do not follow your security policies and procedures."
            },
            {
              "text": "All of the above.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "None of the above.",
              "riskScore": 0,
              "education": "Consider which sanction policies and procedures are reasonable and appropriate for your organization in order to hold personnel accountable if they do not follow your security policies and procedures."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Consider which sanction policies and procedures are reasonable and appropriate for your organization in order to hold personnel accountable if they do not follow your security policies and procedures."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider which sanction policies and procedures are reasonable and appropriate for your organization in order to hold personnel accountable if they do not follow your security policies and procedures."
            }
          ]
        },
        {
          "id": "1",
          "text": "Unqualified, uninformed, or lack of Security Officer",
          "responses": [
            {
              "text": "Unqualified workforce or untrained personnel on security standards and procedures",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Security policies not followed when not enforced",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Misuse of audit tools, information systems, and/or hardware",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Increased chance or spread of unknown threats",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Insider carelessness exposing ePHI",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized information disclosure (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disruption of business processes, information system function, and/or prolonged adversarial presence within information systems",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "2",
          "text": "Untrustworthy employee or business associate",
          "responses": [
            {
              "text": "Information disclosure (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disruption of business processes or information system function",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Sensitive data exposed or tampered with by insider",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Misuse of information systems and/or hardware",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Falsification or destruction of records and/or data corruption",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access granted to outsiders",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "3",
          "text": "Inadequate cybersecurity & IT training",
          "responses": [
            {
              "text": "Information disclosure (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disruption of business processes or information system function",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Social engineering attack or email phishing attack",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Misuse of information systems and/or hardware",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Information system or facility access granted to unauthorized personnel",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Installation of unauthorized software or applications",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "4",
          "text": "Failure to hold workforce members accountable for undesired actions",
          "responses": [
            {
              "text": "Insider carelessness causing disruption to computer systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Insider carelessness exposing ePHI to unauthorized persons or entities",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Lack of interest for protecting sensitive information",
              "riskScore": 0,
              "education": ""
            }
          ]
        }
      ]
    },
    {
      "id": "section_4",
      "title": "Section 4 - Security & Data",
      "questions": [
        {
          "id": "1",
          "text": "Do you manage and control personnel access to ePHI, systems, and facilities?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. User accounts enable organizations to control and monitor each user's access to and activities on devices, EHRs, e-mail, and other third-party software systems. It is essential to protect user accounts to mitigate the risk of cyber threats."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider implementing policies and procedures to determine, authorize, and control access of workforce members to ePHI, systems, and facilities as appropriate. User accounts enable organizations to control and monitor each user's access to and activities on devices, EHRs, e-mail, and other third-party software systems. It is essential to protect user accounts to mitigate the risk of cyber threats."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider looking into whether you have policies and procedures to determine, authorize, and control access of workforce members to ePHI, systems, and facilities as appropriate. User accounts enable organizations to control and monitor each user's access to and activities on devices, EHRs, e-mail, and other third-party software systems. It is essential to protect user accounts to mitigate the risk of cyber threats."
            },
            {
              "text": "We manage and control personnel access to some but not all.",
              "riskScore": 0,
              "education": "Consider implementing policies and procedures to determine, authorize, and control access of workforce members to ePHI, systems, and facilities as appropriate. User accounts enable organizations to control and monitor each user's access to and activities on devices, EHRs, e-mail, and other third-party software systems. It is essential to protect user accounts to mitigate the risk of cyber threats."
            }
          ]
        },
        {
          "id": "2",
          "text": "How do you manage and control personnel access to ePHI, systems, and facilities?",
          "responses": [
            {
              "text": "Detailed log of personnel and access levels based on role. Updates are reviewed by the security officer.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            },
            {
              "text": "Log of personnel names.",
              "riskScore": 0,
              "education": "You should develop, document, and disseminate to workforce members an access control policy. The access control policy should address purpose, scope, roles, responsibilities, management commitment, the expected coordination among organizational entities, and compliance requirements. You should also maintain a list of workforce members with their corresponding level of access. This list should be reviewed and updated by the security officer. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            },
            {
              "text": "Access is granted by role, but we do not maintain a corresponding list of personnel.",
              "riskScore": 0,
              "education": "Make sure your access control measures are effective and up-to-date. Implement a procedure for updating your log upon changes in the workforce to include access levels based on role within your practice. Any updates based on changes in the workforce should be verified by the security officer. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            },
            {
              "text": "We do not keep a detailed log of workforce members or designate access levels based on role.",
              "riskScore": 0,
              "education": "Make sure your access control measures are effective and up-to-date. Implement a procedure for updating your log upon changes in the workforce to include access levels based on role within your practice. Any updates based on changes in the workforce should be verified by the security officer. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            },
            {
              "text": "Detailed log of personnel and access levels based on role.",
              "riskScore": 0,
              "education": "Make sure your access control measures are effective and up-to-date. Implement a procedure for updating your log upon changes in the workforce to include access levels based on role within your practice. Any updates based on changes in the workforce should be verified by the security officer. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            },
            {
              "text": "Log of personnel names and access levels.",
              "riskScore": 0,
              "education": "Make sure your access control measures are effective and up-to-date. Implement a procedure for updating your log upon changes in the workforce to include access levels based on role within your practice. Any updates based on changes in the workforce should be verified by the security officer. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Make sure your access control measures are effective and up-to-date. Implement a procedure for updating your log upon changes in the workforce to include access levels based on role within your practice. Any updates based on changes in the workforce should be verified by the security officer. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            }
          ]
        },
        {
          "id": "3",
          "text": "What is your process for authorizing, establishing, and modifying access to ePHI?",
          "responses": [
            {
              "text": "Our security procedures designate personnel authorized to grant, review, modify, and terminate access. Access levels are reviewed and modified as needed.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Tailor access for each user based on the user's specific workplace requirements. Most users require access to common systems, such as e-mail and file servers. Implementing tailored access is usually called provisioning."
            },
            {
              "text": "Our security procedures designate personnel authorized to grant and terminate access. We do not have a procedure to review and modify access as needed.",
              "riskScore": 0,
              "education": "You should implement formal procedures to review and modify personnel access. Tailor access for each user based on the user's specific workplace requirements. Most users require access to common systems, such as e-mail and file servers. Implementing tailored access is usually called provisioning."
            },
            {
              "text": "Access levels are granted, modified, and terminated as needed, but we do not have formal procedures.",
              "riskScore": 0,
              "education": "You should implement a formal security procedure and designate authorized personnel to grant, review, modify, and terminate access. Access levels should be reviewed and modified as needed. Tailor access for each user based on the user's specific workplace requirements. Most users require access to common systems, such as e-mail and file servers. Implementing tailored access is usually called provisioning."
            },
            {
              "text": "We do not have a process in place to grant, modify, or terminate access.",
              "riskScore": 0,
              "education": "You should implement formal procedures to grant, modify, review, and terminate personnel access. Access levels should be reviewed and modified as needed. Tailor access for each user based on the user's specific workplace requirements. Most users require access to common systems, such as e-mail and file servers. Implementing tailored access is usually called provisioning."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "You should implement formal procedures to grant, modify, review, and terminate personnel access. Access levels should be reviewed and modified as needed. Tailor access for each user based on the user's specific workplace requirements. Most users require access to common systems, such as e-mail and file servers. Implementing tailored access is usually called provisioning."
            }
          ]
        },
        {
          "id": "4",
          "text": "How much access to ePHI is granted to users or other entities?",
          "responses": [
            {
              "text": "Minimum access necessary based on the user's formal role.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            },
            {
              "text": "Access is granted based on user duties and activities but not on any formal role or minimum necessary consideration.",
              "riskScore": 0,
              "education": "Policies and procedures outlining how users are granted only the minimum necessary access to ePHI should be documented and implemented based on the user role. Allowing a high degree of access to ePHI may have negative impacts to your practice. Unauthorized or inappropriate access to ePHI can compromise the confidentiality, integrity, and availability of your ePHI. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            },
            {
              "text": "No limit to access.",
              "riskScore": 0,
              "education": "Policies and procedures outlining how users are granted only the minimum necessary access to ePHI should be documented and implemented based on the user role. Allowing a high degree of access to ePHI may have negative impacts to your practice. Unauthorized or inappropriate access to ePHI can compromise the confidentiality, integrity, and availability of your ePHI. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Policies and procedures outlining how users are granted only the minimum necessary access to ePHI should be documented and implemented based on the user role. Allowing a high degree of access to ePHI may have negative impacts to your practice. Unauthorized or inappropriate access to ePHI can compromise the confidentiality, integrity, and availability of your ePHI. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            }
          ]
        },
        {
          "id": "5",
          "text": "How are individual users identified when accessing ePHI?",
          "responses": [
            {
              "text": "Unique IDs and individual passwords are created for authorized workforce members and contractors in order access ePHI.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook)."
            },
            {
              "text": "Unique IDs are required to access ePHI but these are not always used. Generic or shared accounts also exist that have access to ePHI and are not specific to unique users.",
              "riskScore": 0,
              "education": "If you do not have policies requiring use of a unique identifier for all users accessing ePHI, you might not be able to keep track of authorized users and the roles and responsibilities assigned to them. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook)."
            },
            {
              "text": "Generic usernames and/or shared passwords are used to access ePHI.",
              "riskScore": 0,
              "education": "If you do not have policies requiring use of a unique identifier for all users accessing ePHI, you might not be able to keep track of authorized users and the roles and responsibilities assigned to them. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook)."
            },
            {
              "text": "We do not have a process to authenticate users with unique IDs.",
              "riskScore": 0,
              "education": "If you do not have policies requiring use of a unique identifier for all users accessing ePHI, you might not be able to keep track of authorized users and the roles and responsibilities assigned to them. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook)."
            }
          ]
        },
        {
          "id": "6",
          "text": "Do you ensure all of your workforce members have appropriate access to ePHI?",
          "responses": [
            {
              "text": "Yes. We have written procedures to ensure workforce members' access privileges are the minimum necessary (i.e., \"need to know\") based on their roles. These access privileges are approved by the security officer.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            },
            {
              "text": "Yes. We have written procedures to ensure workforce members' access privileges are the minimum necessary but these are not always based on their roles.",
              "riskScore": 0,
              "education": "You should implement and document procedures to ensure workforce members have access privileges based on their role and no higher than necessary to perform their duties. These procedures and access privileges should be appropriately approved and communicated. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            },
            {
              "text": "Yes. We verbally communicate access privileges to our workforce members but we do not have written procedures.",
              "riskScore": 0,
              "education": "You should implement and document procedures to ensure workforce members have access privileges based on their role and no higher than necessary to perform their duties. These procedures and access privileges should be appropriately approved and communicated. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            },
            {
              "text": "No. We do not have any procedures for ensuring appropriate workforce member access to ePHI.",
              "riskScore": 0,
              "education": "You should implement and document procedures to ensure workforce members have access privileges based on their role and no higher than necessary to perform their duties. These procedures and access privileges should be appropriately approved and communicated. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            }
          ]
        },
        {
          "id": "7",
          "text": "How do you make sure that your workforce's designated access to ePHI is logical, consistent, and appropriate?",
          "responses": [
            {
              "text": "Workforce members are granted access based on the minimum amount necessary for their role. This is consistently applied across the practice and any changes must be formally approved and documented.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Tailor access for each user based on the user's specific workplace requirements. Most users require access to common systems, such as e-mail and file servers. Implementing tailored access is usually called provisioning."
            },
            {
              "text": "Workforce members have a default level of access for their role, but exceptions are commonly granted.",
              "riskScore": 0,
              "education": "Review role-based access to determine how specific you can designate access for users, based on their roles. Implement and document procedures to ensure minimum necessary access is in place across the board to the extent reasonable and appropriate. If access exceptions are commonly granted, they should be documented and policies should be in place outlining the procedure for access exceptions. Tailor access for each user based on the user's specific workplace requirements. Most users require access to common systems, such as e-mail and file servers. Implementing tailored access is usually called provisioning."
            },
            {
              "text": "Our software vendor designates access to users, e.g. based on their role as indicated in the system.",
              "riskScore": 0,
              "education": "Review role-based access to determine how specific you can designate access for users, based on their roles. Implement and document procedures to ensure minimum necessary access is in place across the board to the extent reasonable and appropriate. If access exceptions are commonly granted, they should be documented and policies should be in place outlining the procedure for access exceptions. Tailor access for each user based on the user's specific workplace requirements. Most users require access to common systems, such as e-mail and file servers. Implementing tailored access is usually called provisioning."
            },
            {
              "text": "We do not have a procedure for ensuring user access is appropriate for their role.",
              "riskScore": 0,
              "education": "Review role-based access to determine how specific you can designate access for users, based on their roles. Implement and document procedures to ensure minimum necessary access is in place across the board to the extent reasonable and appropriate. If access exceptions are commonly granted, they should be documented and policies should be in place outlining the procedure for access exceptions. Tailor access for each user based on the user's specific workplace requirements. Most users require access to common systems, such as e-mail and file servers. Implementing tailored access is usually called provisioning."
            }
          ]
        },
        {
          "id": "8",
          "text": "Do you use encryption everywhere ePHI is stored throughout your organization?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option. Whenever reasonable and appropriate implement a mechanism to encrypt and decrypt ePHI. Install encryption software on every endpoint that connects to your EHR system, especially mobile devices such as laptops. Maintain audit trails of this encryption in case a device is ever lost or stolen. This simple and inexpensive precaution may prevent a complicated and expensive breach. If supported by the manufacturer, medical devices should have local encryption enabled (if reasonable and appropriate) in case the device is stolen. Implement an e-mail encryption module that enables users to securely send e-mails to external recipients or to protect information that should only be seen by authorized individuals."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "You might not be able to ensure access to ePHI is denied to unauthorized users if you do not use encryption/decryption methods to control access to ePHI and other health information. Whenever reasonable and appropriate implement a mechanism to encrypt and decrypt ePHI. Install encryption software on every endpoint that connects to your EHR system, especially mobile devices such as laptops. Maintain audit trails of this encryption in case a device is ever lost or stolen. This simple and inexpensive precaution may prevent a complicated and expensive breach. If supported by the manufacturer, medical devices should have local encryption enabled (if reasonable and appropriate) in case the device is stolen. Implement an e-mail encryption module that enables users to securely send e-mails to external recipients or to protect information that should only be seen by authorized individuals."
            },
            {
              "text": "We have not comprehensively evaluated whether encryption is reasonable or appropriate to implement on our devices and information systems.",
              "riskScore": 0,
              "education": "You should evaluate whether encryption is reasonable and appropriate to implement. You might not be able to ensure access to ePHI is denied to unauthorized users if you do not use encryption/decryption methods to control access to ePHI and other health information. Install encryption software on every endpoint that connects to your EHR system, especially mobile devices such as laptops. Maintain audit trails of this encryption in case a device is ever lost or stolen. This simple and inexpensive precaution may prevent a complicated and expensive breach. If supported by the manufacturer, medical devices should have local encryption enabled (if reasonable and appropriate) in case the device is stolen. Implement an e-mail encryption module that enables users to securely send e-mails to external recipients or to protect information that should only be seen by authorized individuals."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "You might not be able to ensure access to ePHI is denied to unauthorized users if you do not use encryption/decryption methods to control access to ePHI and other health information. Whenever reasonable and appropriate implement a mechanism to encrypt and decrypt ePHI. Install encryption software on every endpoint that connects to your EHR system, especially mobile devices such as laptops. Maintain audit trails of this encryption in case a device is ever lost or stolen. This simple and inexpensive precaution may prevent a complicated and expensive breach. If supported by the manufacturer, medical devices should have local encryption enabled (if reasonable and appropriate) in case the device is stolen. Implement an e-mail encryption module that enables users to securely send e-mails to external recipients or to protect information that should only be seen by authorized individuals."
            }
          ]
        },
        {
          "id": "9",
          "text": "What procedures do you have in place to encrypt ePHI when deemed reasonable and appropriate?",
          "responses": [
            {
              "text": "Encryption is evaluated as part of our risk management process. We have procedures in place to encrypt ePHI at rest (e.g., USB drives or tapes) and in transit (e.g., email or cloud EHR) whenever reasonable and appropriate, and find an alternative safeguard when not reasonable and appropriate.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Install encryption software on every endpoint that connects to your EHR system, especially mobile devices such as laptops. Maintain audit trails of this encryption in case a device is ever lost or stolen. This simple and inexpensive precaution may prevent a complicated and expensive breach. Provide regular training on encryption."
            },
            {
              "text": "We have procedures in place to encrypt ePHI in transit (e.g., email or cloud EHR) but not at rest (e.g., USB drives or tapes) whenever reasonable and appropriate.",
              "riskScore": 0,
              "education": "Consider encrypting ePHI when it is in transmission as well as when at rest as part of your risk management process. If encryption is determined not reasonable and appropriate, document the reason why and implement an equivalent, alternative safeguard. Install encryption software on every endpoint that connects to your EHR system, especially mobile devices such as laptops. Maintain audit trails of this encryption in case a device is ever lost or stolen. This simple and inexpensive precaution may prevent a complicated and expensive breach. Provide regular training on encryption."
            },
            {
              "text": "We have procedures in place to encrypt ePHI at rest (e.g., USB drives or tapes) but not in transit (e.g., email or cloud EHR) whenever reasonable and appropriate.",
              "riskScore": 0,
              "education": "Consider encrypting ePHI when it is in transmission as well as when at rest as part of your risk management process. If encryption is determined not reasonable and appropriate, document the reason why and implement an equivalent, alternative safeguard. Install encryption software on every endpoint that connects to your EHR system, especially mobile devices such as laptops. Maintain audit trails of this encryption in case a device is ever lost or stolen. This simple and inexpensive precaution may prevent a complicated and expensive breach. Provide regular training on encryption."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Consider encrypting ePHI when it is in transmission as well as when at rest as part of your risk management process. If encryption is determined not reasonable and appropriate, document the reason why and implement an equivalent, alternative safeguard. Install encryption software on every endpoint that connects to your EHR system, especially mobile devices such as laptops. Maintain audit trails of this encryption in case a device is ever lost or stolen. This simple and inexpensive precaution may prevent a complicated and expensive breach. Provide regular training on encryption."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider encrypting ePHI when it is in transmission as well as when at rest as part of your risk management process. If encryption is determined not reasonable and appropriate, document the reason why and implement an equivalent, alternative safeguard. Install encryption software on every endpoint that connects to your EHR system, especially mobile devices such as laptops. Maintain audit trails of this encryption in case a device is ever lost or stolen. This simple and inexpensive precaution may prevent a complicated and expensive breach. Provide regular training on encryption."
            }
          ]
        },
        {
          "id": "10",
          "text": "Do you use alternative safeguards in place of encryption?",
          "responses": [
            {
              "text": "Yes. When encryption is not reasonable or appropriate, we implement an alternative safeguard and document as appropriate.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. For ePHI that is not, or cannot, be encrypted, or that is managed by a third party, implement and document alternate security controls to minimize theft or unauthorized removal. Example controls could include anti-theft cables, locks on rooms where the devices are located, user authorization restrictions, and badge readers to monitor access to rooms where devices are located."
            },
            {
              "text": "No. We do not always have alternative safeguards when encryption is not reasonable or appropriate.",
              "riskScore": 0,
              "education": "You might not be able to ensure access to ePHI is denied to unauthorized users if you do not use alternative safeguards or methods to control access to ePHI and other health information. Whenever encryption is not reasonable or appropriate, implement and document an alternative safeguard or mechanism to protect your ePHI. For ePHI that is not, or cannot, be encrypted, or that is managed by a third party, implement and document alternate security controls to minimize theft or unauthorized removal. Example controls could include anti-theft cables, locks on rooms where the devices are located, user authorization restrictions, and badge readers to monitor access to rooms where devices are located."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "You might not be able to ensure access to ePHI is denied to unauthorized users if you do not use alternative safeguards or methods to control access to ePHI and other health information. Whenever encryption is not reasonable or appropriate, implement and document an alternative safeguard or mechanism to protect your ePHI. For ePHI that is not, or cannot, be encrypted, or that is managed by a third party, implement and document alternate security controls to minimize theft or unauthorized removal. Example controls could include anti-theft cables, locks on rooms where the devices are located, user authorization restrictions, and badge readers to monitor access to rooms where devices are located."
            },
            {
              "text": "We have encryption in place for some devices and systems which access ePHI, but have not comprehensively evaluated the reasonable and appropriateness to do so for all devices and systems. We do not always have alternative safeguards when encryption is not reasonable and appropriate.",
              "riskScore": 0,
              "education": "You might not be able to ensure access to ePHI is denied to unauthorized users if you do not use alternative safeguards or methods to control access to ePHI and other health information. Whenever encryption is not reasonable or appropriate, implement and document an alternative safeguard or mechanism to protect your ePHI. For ePHI that is not, or cannot, be encrypted, or that is managed by a third party, implement and document alternate security controls to minimize theft or unauthorized removal. Example controls could include anti-theft cables, locks on rooms where the devices are located, user authorization restrictions, and badge readers to monitor access to rooms where devices are located."
            }
          ]
        },
        {
          "id": "11",
          "text": "When encryption is deemed unreasonable or inappropriate to implement, do you document the use of an alternative safeguard?",
          "responses": [
            {
              "text": "Yes. We have policies and procedures to identify encryption capabilities of our devices and information systems. When encryption is not reasonable or appropriate, we implement an alternative safeguard and document it.",
              "riskScore": 1,
              "education": "The best practice is having policies and procedures to identify the encryption capabilities of your devices and information systems and then documenting when ePHI encryption is not reasonable or appropriate and that you have implemented an alternative safeguard. For devices that cannot be encrypted or that are managed by a third party, implement physical security controls to minimize theft or unauthorized removal. Examples include installation of anti-theft cables, locks on rooms where the devices are located, and the use of badge readers to monitor access to rooms where devices are located."
            },
            {
              "text": "No. We do not have policies or procedures to document alternative safeguards as a means of controlling access to ePHI on our devices and information systems.",
              "riskScore": 0,
              "education": "The best practice is having policies and procedures to identify the encryption capabilities of your devices and information systems and then documenting when ePHI encryption is not reasonable or appropriate and that you have implemented an alternative safeguard. For devices that cannot be encrypted or that are managed by a third party, implement physical security controls to minimize theft or unauthorized removal. Examples include installation of anti-theft cables, locks on rooms where the devices are located, and the use of badge readers to monitor access to rooms where devices are located."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "The best practice is having policies and procedures to identify the encryption capabilities of your devices and information systems and then documenting when ePHI encryption is not reasonable or appropriate and that you have implemented an alternative safeguard. For devices that cannot be encrypted or that are managed by a third party, implement physical security controls to minimize theft or unauthorized removal. Examples include installation of anti-theft cables, locks on rooms where the devices are located, and the use of badge readers to monitor access to rooms where devices are located."
            }
          ]
        },
        {
          "id": "12",
          "text": "Have you evaluated implementing any of the following encryption solutions in your local environment to protect ePHI: full disk encryption, file/folder/volume encryption, database encryption, encryption of thumb drives or other external media (including backup media)?",
          "responses": [
            {
              "text": "All of the above (and other solutions as applicable) have been identified, assessed if reasonable and appropriate to protect ePHI, and documented.",
              "riskScore": 1,
              "education": "Encryption in these areas is critical to protecting ePHI in your local environment. Encryption applications prevent hackers from accessing sensitive data, usually by requiring a \"key\" to encrypt and/or decrypt data. Prohibit the use of unencrypted storage, such as thumb drives, mobile phones, or computers. Require encryption of these mobile storage mediums before use. If responses to questions in the tool represent risks in the aggregate, ensure that responses include sufficient detail or that supplemental documentation is maintained supporting aggregate risk determinations."
            },
            {
              "text": "Some of the above (and other solutions as applicable) have been identified, assessed if reasonable and appropriate to protect ePHI, and documented.",
              "riskScore": 0,
              "education": "Consider reviewing and evaluating all the locations where you are processing, storing, or transmitting ePHI and whether it is reasonable to implement encryption. Encryption can help safeguard your ePHI, whether you are transmitting it over the Internet, backing it up on a server, or just carrying a mobile device or your laptop to and from your facility. Encrypting ePHI makes it completely unreadable to anyone but you or its intend recipient. Encryption applications prevent hackers from accessing sensitive data, usually by requiring a \"key\" to encrypt and/or decrypt data. Prohibit the use of unencrypted storage, such as thumb drives, mobile phones, or computers. Require encryption of these mobile storage mediums before use. If responses to questions in the tool represent risks in the aggregate, ensure that responses include sufficient detail or that supplemental documentation is maintained supporting aggregate risk determinations."
            },
            {
              "text": "None of the above.",
              "riskScore": 0,
              "education": "Consider reviewing and evaluating all the locations where you are processing, storing, or transmitting ePHI and whether it is reasonable to implement encryption. Encryption can help safeguard your ePHI, whether you are transmitting it over the Internet, backing it up on a server, or just carrying a mobile device or your laptop to and from your facility. Encrypting ePHI makes it completely unreadable to anyone but you or its intend recipient. Encryption applications prevent hackers from accessing sensitive data, usually by requiring a \"key\" to encrypt and/or decrypt data. Prohibit the use of unencrypted storage, such as thumb drives, mobile phones, or computers. Require encryption of these mobile storage mediums before use."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider reviewing and evaluating all the locations where you are processing, storing, or transmitting ePHI and whether it is reasonable to implement encryption. Encryption can help safeguard your ePHI, whether you are transmitting it over the Internet, backing it up on a server, or just carrying a mobile device or your laptop to and from your facility. Encrypting ePHI makes it completely unreadable to anyone but you or its intend recipient. Encryption applications prevent hackers from accessing sensitive data, usually by requiring a \"key\" to encrypt and/or decrypt data. Prohibit the use of unencrypted storage, such as thumb drives, mobile phones, or computers. Require encryption of these mobile storage mediums before use."
            }
          ]
        },
        {
          "id": "13",
          "text": "Have you evaluated implementing encryption solutions for any of the following cloud services to protect ePHI: email service, file storage, web applications, databases, remote system backups?",
          "responses": [
            {
              "text": "All of the above (and other solutions as applicable) have been identified, assessed if reasonable and appropriate to protect ePHI, and documented.",
              "riskScore": 1,
              "education": "Encryption in these areas is critical to protecting ePHI in your cloud environments. Contracts with EHR vendors should include language that requires ePHI to be encrypted both at rest and during transmission between systems. If responses to questions in the tool represent risks in the aggregate, ensure that responses include sufficient detail or that supplemental documentation is maintained supporting aggregate risk determinations."
            },
            {
              "text": "Some of the above (and other solutions as applicable) have been identified, assessed if reasonable and appropriate to protect ePHI, and documented.",
              "riskScore": 0,
              "education": "Consider reviewing and evaluating all the locations where you are processing, storing, or transmitting ePHI and whether it is reasonable to implement encryption. Encryption can help safeguard your ePHI, whether you are transmitting it over the Internet, backing it up on a server, or just carrying a mobile device or your laptop to and from your facility. Encrypting ePHI makes it completely unreadable to anyone but you or its intended recipient. Contracts with EHR vendors should include language that requires ePHI to be encrypted both at rest and during transmission between systems. If responses to questions in the tool represent risks in the aggregate, ensure that responses include sufficient detail or that supplemental documentation is maintained supporting aggregate risk determinations."
            },
            {
              "text": "None of the above.",
              "riskScore": 0,
              "education": "Consider reviewing and evaluating all the locations where you are processing, storing, or transmitting ePHI and whether it is reasonable to implement encryption. Encryption can help safeguard your ePHI, whether you are transmitting it over the Internet, backing it up on a server, or just carrying a mobile device or your laptop to and from your facility. Encrypting ePHI makes it completely unreadable to anyone but you or its intended recipient. Contracts with EHR vendors should include language that requires ePHI to be encrypted both at rest and during transmission between systems."
            },
            {
              "text": "Not applicable.",
              "riskScore": 0,
              "education": "Consider reviewing and evaluating all the locations where you are processing, storing, or transmitting ePHI and whether it is reasonable to implement encryption. Encryption can help safeguard your ePHI, whether you are transmitting it over the Internet, backing it up on a server, or just carrying a mobile device or your laptop to and from your facility. Encrypting ePHI makes it completely unreadable to anyone but you or its intended recipient. Contracts with EHR vendors should include language that requires ePHI to be encrypted both at rest and during transmission between systems."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider reviewing and evaluating all the locations where you are processing, storing, or transmitting ePHI and whether it is reasonable to implement encryption. Encryption can help safeguard your ePHI, whether you are transmitting it over the Internet, backing it up on a server, or just carrying a mobile device or your laptop to and from your facility. Encrypting ePHI makes it completely unreadable to anyone but you or its intended recipient. Contracts with EHR vendors should include language that requires ePHI to be encrypted both at rest and during transmission between systems."
            }
          ]
        },
        {
          "id": "14",
          "text": "Have you evaluated implementing any of the following encryption solutions for ePHI in transit: encryption of internet traffic by means of a VPN, web traffic over HTTP encrypted using Transport Layer Security (TLS), or secure file transfer?",
          "responses": [
            {
              "text": "All of the above (and other solutions as applicable) have been identified, assessed if reasonable and appropriate to protect ePHI, and documented.",
              "riskScore": 1,
              "education": "Encryption in these areas is critical to protecting ePHI in transit. At minimum, provide annual training on the most important policy considerations, such as the use of encryption and PHI transmission restrictions. Implement an e-mail encryption module that enables users to securely send e-mails to external recipients or to protect information that should only be seen by authorized individuals. If responses to questions in the tool represent risks in the aggregate, ensure that responses include sufficient detail or that supplemental documentation is maintained supporting aggregate risk determinations."
            },
            {
              "text": "Some of the above (and other solutions as applicable) have been identified, assessed if reasonable and appropriate to protect ePHI, and documented.",
              "riskScore": 0,
              "education": "Consider reviewing and evaluating all the locations where you are processing, storing, or transmitting ePHI and whether it is reasonable to implement encryption. Encryption can help safeguard your ePHI, whether you are transmitting it over the Internet, backing it up on a server, or just carrying a mobile device or your laptop to and from your facility. Encrypting ePHI makes it completely unreadable to anyone but you or its intended recipient. At minimum, provide annual training on the most important policy considerations, such as the use of encryption and PHI transmission restrictions. Implement an e-mail encryption module that enables users to securely send e-mails to external recipients or to protect information that should only be seen by authorized individuals. If responses to questions in the tool represent risks in the aggregate, ensure that responses include sufficient detail or that supplemental documentation is maintained supporting aggregate risk determinations."
            },
            {
              "text": "None of the above.",
              "riskScore": 0,
              "education": "Consider reviewing and evaluating all the locations where you are processing, storing, or transmitting ePHI and whether it is reasonable to implement encryption. Encryption can help safeguard your ePHI, whether you are transmitting it over the Internet, backing it up on a server, or just carrying a mobile device or your laptop to and from your facility. Encrypting ePHI makes it completely unreadable to anyone but you or its intended recipient. At minimum, provide annual training on the most important policy considerations, such as the use of encryption and PHI transmission restrictions. Implement an e-mail encryption module that enables users to securely send e-mails to external recipients or to protect information that should only be seen by authorized individuals."
            },
            {
              "text": "I don't know",
              "riskScore": 0,
              "education": "Consider reviewing and evaluating all the locations where you are processing, storing, or transmitting ePHI and whether it is reasonable to implement encryption. Encryption can help safeguard your ePHI, whether you are transmitting it over the Internet, backing it up on a server, or just carrying a mobile device or your laptop to and from your facility. Encrypting ePHI makes it completely unreadable to anyone but you or its intended recipient. At minimum, provide annual training on the most important policy considerations, such as the use of encryption and PHI transmission restrictions. Implement an e-mail encryption module that enables users to securely send e-mails to external recipients or to protect information that should only be seen by authorized individuals."
            }
          ]
        },
        {
          "id": "15",
          "text": "Do you periodically review your information systems for how security settings can be implemented to safeguard ePHI?",
          "responses": [
            {
              "text": "Yes. We periodically review our information system and evaluate if additional settings can be implemented to safeguard ePHI and document our security settings.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Patching (i.e., regularly updating) systems removes vulnerabilities that can be exploited by attackers. Each patch modifies a software application, rendering it more difficult for hackers to maintain programs that are aligned with the most current version of that software application. Configure endpoints to patch automatically and ensure that third-party applications are patched as soon as possible. Schedule and conduct vulnerability scans on servers and systems under your control to proactively identify technology flaws. Remediate flaws based on the severity of the identified vulnerability. This method is considered an \"unauthenticated scan.\" The scanner has no extra sets of privileges to the server. It queries a server based on ports that are active and present for network connectivity. Each server is queried for vulnerabilities based upon the level of sophistication of the software scanner. Conduct web application scanning of internet-facing webservers, such as web-based patient portals. Specialized vulnerability scanners can interrogate running web applications to identify vulnerabilities in the application design. Conduct routine patching of security flaws in servers, applications (including web applications), and third-party software. Maintain software at least monthly, implementing patches distributed by the vendor community, if patching is not automatic. Robust patch management processes mitigate vulnerabilities associated with obsolete software versions, which are often easier for hackers to exploit."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider periodically reviewing the security settings on all systems which process, store, or transmit ePHI for how you can implement mechanisms to protect ePHI. Patching (i.e., regularly updating) systems removes vulnerabilities that can be exploited by attackers. Each patch modifies a software application, rendering it more difficult for hackers to maintain programs that are aligned with the most current version of that software application. Configure endpoints to patch automatically and ensure that third-party applications are patched as soon as possible. Schedule and conduct vulnerability scans on servers and systems under your control to proactively identify technology flaws. Remediate flaws based on the severity of the identified vulnerability. This method is considered an \"unauthenticated scan.\" The scanner has no extra sets of privileges to the server. It queries a server based on ports that are active and present for network connectivity. Each server is queried for vulnerabilities based upon the level of sophistication of the software scanner. Conduct web application scanning of internet-facing webservers, such as web-based patient portals. Specialized vulnerability scanners can interrogate running web applications to identify vulnerabilities in the application design. Conduct routine patching of security flaws in servers, applications (including web applications),and third-party software. Maintain software at least monthly, implementing patches distributed by the vendor community, if patching is not automatic. Robust patch management processes mitigate vulnerabilities associated with obsolete software versions, which are often easier for hackers to exploit."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider looking into whether your practice periodically reviews the security settings on all systems which process, store, or transmit ePHI for how you can implement mechanisms to protect ePHI. Patching (i.e., regularly updating) systems removes vulnerabilities that can be exploited by attackers. Each patch modifies a software application, rendering it more difficult for hackers to maintain programs that are aligned with the most current version of that software application. Configure endpoints to patch automatically and ensure that third-party applications are patched as soon as possible. Schedule and conduct vulnerability scans on servers and systems under your control to proactively identify technology flaws. Remediate flaws based on the severity of the identified vulnerability. This method is considered an \"unauthenticated scan.\" The scanner has no extra sets of privileges to the server. It queries a server based on ports that are active and present for network connectivity. Each server is queried for vulnerabilities based upon the level of sophistication of the software scanner. Conduct web application scanning of internet-facing webservers, such as web-based patient portals. Specialized vulnerability scanners can interrogate running web applications to identify vulnerabilities in the application design. Conduct routine patching of security flaws in servers, applications (including web applications),and third-party software. Maintain software at least monthly, implementing patches distributed by the vendor community, if patching is not automatic. Robust patch management processes mitigate vulnerabilities associated with obsolete software versions, which are often easier for hackers to exploit."
            }
          ]
        },
        {
          "id": "16",
          "text": "How are you aware of the security settings for information systems which process, store, or transmit ePHI?",
          "responses": [
            {
              "text": "All systems which create, receive, maintain, or transmit ePHI (including any firewalls, databases, servers, and networked devices) have been examined to determine how security settings can be implemented to most appropriately protect ePHI.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Vulnerability scans may yield large amounts of data, which organizations urgently need to classify, evaluate, and prioritize to remediate security flaws before an attacker can exploit them."
            },
            {
              "text": "We are aware that systems have security settings to protect ePHI but have not reviewed all systems comprehensively.",
              "riskScore": 0,
              "education": "Consider reviewing security settings for all systems which process, store, and transmit ePHI. Vulnerability scans may yield large amounts of data, which organizations urgently need to classify, evaluate, and prioritize to remediate security flaws before an attacker can exploit them."
            },
            {
              "text": "We do not have a process to review security settings for information systems which process, store, or transmit ePHI.",
              "riskScore": 0,
              "education": "If you do not identify the access control security settings necessary for each of your information systems and electronic devices, you are not taking full advantage of the security features available in the hardware and software. Vulnerability scans may yield large amounts of data, which organizations urgently need to classify, evaluate, and prioritize to remediate security flaws before an attacker can exploit them."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "If you do not identify the access control security settings necessary for each of your information systems and electronic devices, you are not taking full advantage of the security features available in the hardware and software. Vulnerability scans may yield large amounts of data, which organizations urgently need to classify, evaluate, and prioritize to remediate security flaws before an attacker can exploit them."
            }
          ]
        },
        {
          "id": "17",
          "text": "Do you use security settings and mechanisms to record and examine information system activity?",
          "responses": [
            {
              "text": "Yes and documentation is available of security setting assessments and mechanisms to record and examine information system activity.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. User accounts enable organizations to control and monitor each user's access to and activities on devices, EHRs, e-mail, and other third-party software systems. Frequently reviewing access and activities on all devices that access ePHI allows you to be proactive for potential threats or vulnerabilities that arise."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider implementing hardware, software, and/or procedural mechanisms to monitor system activity. User accounts enable organizations to control and monitor each user's access. Frequently reviewing access and activities on all devices that access ePHI allows you to be proactive for potential threats or vulnerabilities that arise."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider investigating whether your practice has implemented hardware, software, and/or procedural mechanisms to monitor system activity. Your practice should have system monitoring mechanisms in place where ePHI is accessible. User accounts enable organizations to control and monitor each user's access to and activities on devices, EHRs, e-mail, and other third-party software systems. Frequently reviewing access and activities on all devices that access ePHI allows you to be proactive for potential threats or vulnerabilities that arise."
            }
          ]
        },
        {
          "id": "18",
          "text": "What mechanisms are in place to monitor or log system activity?",
          "responses": [
            {
              "text": "Monitoring of system users, access attempts, and modifications. This includes a date/time stamp.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Implement access management procedures to track and monitor user access to computers and programs."
            },
            {
              "text": "Date/time stamp of system access attempts and modifications only.",
              "riskScore": 0,
              "education": "Determine the mechanisms available to log and monitor system activity. Make sure a procedure to monitor system activity logs is implemented and documented. Implement access management procedures to track and monitor user access to computers and programs."
            },
            {
              "text": "Monitoring of system modifications only.",
              "riskScore": 0,
              "education": "Determine the mechanisms available to log and monitor system activity. Make sure a procedure to monitor system activity logs is implemented and documented. Implement access management procedures to track and monitor user access to computers and programs."
            },
            {
              "text": "Identity of users accessing and modifying within the system.",
              "riskScore": 0,
              "education": "Determine the mechanisms available to log and monitor system activity. Make sure a procedure to monitor system activity logs is implemented and documented. Implement access management procedures to track and monitor user access to computers and programs."
            },
            {
              "text": "None of the above.",
              "riskScore": 0,
              "education": "Determine the mechanisms available to log and monitor system activity. Make sure a procedure to monitor system activity logs is implemented and documented. Implement access management procedures to track and monitor user access to computers and programs."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Determine the mechanisms available to log and monitor system activity. Make sure a procedure to monitor system activity logs is implemented and documented. Implement access management procedures to track and monitor user access to computers and programs."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Determine the mechanisms available to log and monitor system activity. Make sure a procedure to monitor system activity logs is implemented and documented. Implement access management procedures to track and monitor user access to computers and programs."
            }
          ]
        },
        {
          "id": "19",
          "text": "How do you monitor or track ePHI system activity?",
          "responses": [
            {
              "text": "System activity records are reviewed on a regular basis with the results of such reviews documented. The frequency of reviews is documented within our procedures. Results of activity reviews are also maintained, including activities which may prompt further investigation.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Implement access management procedures to track and monitor user access to computers and programs."
            },
            {
              "text": "System activity records are reviewed as needed but not on a regular basis. Results of activity reviews are maintained, including activities which may prompt further investigation.",
              "riskScore": 0,
              "education": "Ensure your practice is able to detect and prevent security incidents by regularly reviewing system activity information as part of its ongoing operations and following security incidents. Implement access management procedures to track and monitor user access to computers and programs."
            },
            {
              "text": "System activity records are reviewed as needed but not on a regular basis. Documentation of activity reviews are not maintained.",
              "riskScore": 0,
              "education": "Ensure your practice is able to detect and prevent security incidents by regularly reviewing system activity information as part of its ongoing operations and following security incidents. Implement access management procedures to track and monitor user access to computers and programs."
            },
            {
              "text": "System activity records are not reviewed as needed or on a regular basis.",
              "riskScore": 0,
              "education": "Ensure your practice is able to detect and prevent security incidents by regularly reviewing system activity information as part of its ongoing operations and following security incidents. Implement access management procedures to track and monitor user access to computers and programs."
            }
          ]
        },
        {
          "id": "20",
          "text": "Do you have automatic logoff enabled on devices and platforms accessing ePHI?",
          "responses": [
            {
              "text": "Yes, automatic logoff is enabled on all devices and platforms to terminate access to ePHI after a set time of inactivity.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Configure systems and endpoints to automatically lock and log off users after a predetermined period of inactivity, such as 15 minutes."
            },
            {
              "text": "Yes, automatic logoff is enabled but not on all devices and platforms to terminate access to ePHI after a set time of inactivity.",
              "riskScore": 0,
              "education": "Consider implementing automatic logoff on all devices and platforms which access ePHI. If this is not determined to be reasonable and appropriate, document the reason why and what compensating control is in its place. Configure systems and endpoints to automatically lock and log off users after a predetermined period of inactivity, such as 15 minutes."
            },
            {
              "text": "Automatic time-out is enabled on electronic devices accessing ePHI, but automatic logoff to fully terminate the session is not enabled.",
              "riskScore": 0,
              "education": "Consider implementing automatic logoff on all devices and platforms which access ePHI. If this is not determined to be reasonable and appropriate, document the reason why and what compensating control is in its place. Configure systems and endpoints to automatically lock and log off users after a predetermined period of inactivity, such as 15 minutes."
            },
            {
              "text": "Automatic logoff is not enabled on devices or platforms accessing ePHI.",
              "riskScore": 0,
              "education": "Consider implementing automatic logoff on all devices and platforms which access ePHI. If this is not determined to be reasonable and appropriate, document the reason why and what compensating control is in its place. Configure systems and endpoints to automatically lock and log off users after a predetermined period of inactivity, such as 15 minutes."
            }
          ]
        },
        {
          "id": "21",
          "text": "Do you ensure users accessing ePHI are who they claim to be?",
          "responses": [
            {
              "text": "Yes. We require strong authentication where possible and have documentation of generic, shared, application, service, and system account assessments.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Strong authentication is one way to confirm users accessing ePHI are who they claim to be. The use of shared or generic accounts should be avoided. If shared accounts are required, train and regularly remind users that they must sign out upon completion of activity or whenever they leave the device, even for a moment. Passwords should be changed after each use. Sharing accounts exposes organizations to greater vulnerabilities. For example, the complexity of updating passwords for multiple users on a shared account may result in a compromised password remaining active and allowing unauthorized access over an extended period of time."
            },
            {
              "text": "No. We have no specific policies or procedures that help us verify users accessing ePHI are who they claim to be.",
              "riskScore": 0,
              "education": "Procedures should be in place to verify users accessing ePHI are who they claim to be, such as user authentication. Strong authentication is one way to confirm users accessing ePHI are who they claim to be. The use of shared or generic accounts should be avoided. If shared accounts are required, train and regularly remind users that they must sign out upon completion of activity or whenever they leave the device, even for a moment. Passwords should be changed after each use. Sharing accounts exposes organizations to greater vulnerabilities. For example, the complexity of updating passwords for multiple users on a shared account may result in a compromised password remaining active and allowing unauthorized access over an extended period of time."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Procedures should be in place to verify users accessing ePHI are who they claim to be, such as user authentication. Strong authentication is one way to confirm users accessing ePHI are who they claim to be. The use of shared or generic accounts should be avoided. If shared accounts are required, train and regularly remind users that they must sign out upon completion of activity or whenever they leave the device, even for a moment. Passwords should be changed after each use. Sharing accounts exposes organizations to greater vulnerabilities. For example, the complexity of updating passwords for multiple users on a shared account may result in a compromised password remaining active and allowing unauthorized access over an extended period of time."
            }
          ]
        },
        {
          "id": "22",
          "text": "How do you ensure users accessing ePHI are who they claim to be?",
          "responses": [
            {
              "text": "Users authenticate themselves to access ePHI using the method authorized by our practice's policy and procedure (e.g., user name and password, physical token, or biometric feature) and documentation is available for authentication solutions (e.g., EHR, VPN, Active Directory, admin tools).",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Configure systems and endpoints to automatically lock users out after a specific number of failed login attempts. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            },
            {
              "text": "Users authenticate themselves to access ePHI, but we do not have a policy or procedure prescribing the method.",
              "riskScore": 0,
              "education": "Requiring that users utilize unique usernames and passwords, or other forms of authentication, helps to reduce the risk that unauthorized users can access ePHI and compromise access controls already in place. Ensure this is consistently implemented at your practice by having a documented procedures to verify that a person or entity seeking access to ePHI is the one claimed. Configure systems and endpoints to automatically lock users out after a specific number of failed login attempts. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            },
            {
              "text": "Users do not always have unique authentication to access ePHI (e.g., inadvisable practices such as sharing user names and passwords between multiple members of the workforce may occur).",
              "riskScore": 0,
              "education": "Requiring that users utilize unique usernames and passwords, or other forms of authentication, helps to reduce the risk that unauthorized users can access ePHI and compromise access controls already in place. Ensure this is consistently implemented at your practice by having a documented procedures to verify that a person or entity seeking access to ePHI is the one claimed. Configure systems and endpoints to automatically lock users out after a specific number of failed login attempts. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            },
            {
              "text": "We do not have a procedure for authenticating users.",
              "riskScore": 0,
              "education": "Requiring that users utilize unique usernames and passwords, or other forms of authentication, helps to reduce the risk that unauthorized users can access ePHI and compromise access controls already in place. Ensure this is consistently implemented at your practice by having a documented procedures to verify that a person or entity seeking access to ePHI is the one claimed. Configure systems and endpoints to automatically lock users out after a specific number of failed login attempts. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            }
          ]
        },
        {
          "id": "23",
          "text": "How do you determine the means by which ePHI is accessed?",
          "responses": [
            {
              "text": "All systems, devices, and applications which access ePHI are identified, evaluated, approved, and inventoried. Users can only access ePHI through these approved systems, devices, and applications.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook). For devices that are accessed off site, leverage technologies that use multi-factor authentication (MFA) before permitting users to access data or applications on the device. Logins that use only a username and password are often compromised through phishing e-mails. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            },
            {
              "text": "Applications which access ePHI are identified, evaluated, approved, and inventoried, but we do not manage which devices can access these applications (e.g., workforce members' personal devices accessing a cloud-based EHR without first identifying and approving the device)",
              "riskScore": 0,
              "education": "Unsecured points could compromise data accessed through an otherwise secure application. Consider implementing a device management process to ensure security standards are in place for all points accessing ePHI. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook). For devices that are accessed off site, leverage technologies that use multi-factor authentication (MFA) before permitting users to access data or applications on the device. Logins that use only a username and password are often compromised through phishing e-mails. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            },
            {
              "text": "Devices and systems which access ePHI are identified, evaluated, approved, and inventoried, but we do not manage which applications can access these applications (e.g., ePHI is maintained in formats which can be used by many applications)",
              "riskScore": 0,
              "education": "Secure devices can compromise data when the data itself is used by potentially insecure applications. Consider implementing a process to manage which applications access ePHI and how they will securely be enabled to do so. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook). For devices that are accessed off site, leverage technologies that use multi-factor authentication (MFA) before permitting users to access data or applications on the device. Logins that use only a username and password are often compromised through phishing e-mails. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            },
            {
              "text": "We do not have a procedure for determining the means by which ePHI can be accessed appropriately.",
              "riskScore": 0,
              "education": "Failing to manage which devices and applications can access ePHI enables widespread access that may not be secure, increasing the chance for the confidentiality, integrity, and availability of ePHI to be compromised. Assign a separate user account to each user in your organization. Train and regularly remind users that they must never share their passwords. Require each user to create an account password that is different from the ones used for personal internet or e-mail access (e.g., Gmail, Yahoo, Facebook). For devices that are accessed off site, leverage technologies that use multi-factor authentication (MFA) before permitting users to access data or applications on the device. Logins that use only a username and password are often compromised through phishing e-mails. Implement MFA authentication for the cloud-based systems that your organization uses to store or process sensitive data, such as EHRs. MFA mitigates the risk of access by unauthorized users."
            }
          ]
        },
        {
          "id": "24",
          "text": "Do you protect ePHI from unauthorized modification or destruction?",
          "responses": [
            {
              "text": "Yes. We have developed and implemented policies and procedures to protect ePHI from improper alteration or destruction.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Organizational policies should address all user interactions with sensitive data and reinforce the consequences of lost or compromised data."
            },
            {
              "text": "Yes. We have some procedures to protect the integrity of our ePHI but these may not be totally comprehensive.",
              "riskScore": 0,
              "education": "Implement policies and procedures to protect ePHI from unauthorized modification or destruction, such as user activity monitoring or data validation tools. Organizational policies should address all user interactions with sensitive data and reinforce the consequences of lost or compromised data."
            },
            {
              "text": "No. We do not have policies or procedures to ensure the protection of ePHI.",
              "riskScore": 0,
              "education": "Implement policies and procedures to protect ePHI from unauthorized modification or destruction, such as user activity monitoring or data validation tools. Organizational policies should address all user interactions with sensitive data and reinforce the consequences of lost or compromised data."
            }
          ]
        },
        {
          "id": "25",
          "text": "How do you confirm that ePHI has not been modified or destroyed without authorization?",
          "responses": [
            {
              "text": "We have mechanisms (e.g., integrity verification tools) to corroborate that ePHI has not been altered or destroyed in an unauthorized manner or detect if such alteration occurs.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Establish a data classification policy that categorizes data as, for example, Sensitive, Internal Use, or Public Use. Identify the types of records relevant to each category. Implement data loss prevention technologies to mitigate the risk of unauthorized access to PHI."
            },
            {
              "text": "We manually monitor changes made to ePHI in systems with audit log functionality, but do not have automated systems.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. You may want to consider implementing automated electronic mechanisms and/or integrity verification tools. Establish a data classification policy that categorizes data as, for example, Sensitive, Internal Use, or Public Use. Identify the types of records relevant to each category. Implement data loss prevention technologies to mitigate the risk of unauthorized access to PHI."
            },
            {
              "text": "We do not have resources or procedures in place to verify the integrity of ePHI.",
              "riskScore": 0,
              "education": "Your practice may not be able to safeguard its ePHI if it does not have authentication mechanisms and tools, such as log monitoring or data encryption validation, that can authenticate ePHI. Consider implementing a procedure to validate the integrity of your ePHI. If this is determined to not be reasonable and appropriate, document the reason why and what compensating control is in its place. Establish a data classification policy that categorizes data as, for example, Sensitive, Internal Use, or Public Use. Identify the types of records relevant to each category. Implement data loss prevention technologies to mitigate the risk of unauthorized access to PHI."
            }
          ]
        },
        {
          "id": "26",
          "text": "Do you protect against unauthorized access to or modification of ePHI when it is being transmitted electronically?",
          "responses": [
            {
              "text": "Yes. We have implemented technical security measures and procedures to prevent unauthorized access to and detect modification of transmitted ePHI.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. When e-mailing PHI, use a secure messaging application such as Direct Secure Messaging (DSM),which is a nationally adopted secure e-mail protocol and network for transmitting PHI. DSM can be obtained from EHR vendors and other health information exchange systems. It was developed and adopted through the Meaningful Use program, and many medical organizations nationwide now use DSM networks. When texting PHI, use a secure texting system."
            },
            {
              "text": "We have developed policies and procedures to guide workforce members on the secure transmission of ePHI, but no resources are in place (e.g., encrypted email).",
              "riskScore": 0,
              "education": "Implement technical security measures to guard against unauthorized access to ePHI that is transmitted over an electronic communication network in addition to developing protocols and procedures. Consider implementing measures to detect modification of transmitted ePHI; if this is determined to not be reasonable and appropriate, document the reason why along with the compensating control in place. When e-mailing PHI, use a secure messaging application such as Direct Secure Messaging (DSM),which is a nationally adopted secure e-mail protocol and network for transmitting PHI. DSM can be obtained from EHR vendors and other health information exchange systems. It was developed and adopted through the Meaningful Use program, and many medical organizations nationwide now use DSM networks. When texting PHI, use a secure texting system."
            },
            {
              "text": "Workforce members are verbally instructed to use secure modes of ePHI transmission.",
              "riskScore": 0,
              "education": "Implement technical security measures to guard against unauthorized access to ePHI that is transmitted over an electronic communication network in addition to developing protocols and procedures. Consider implementing measures to detect modification of transmitted ePHI; if this is determined to not be reasonable and appropriate, document the reason why along with the compensating control in place. When e-mailing PHI, use a secure messaging application such as Direct Secure Messaging (DSM),which is a nationally adopted secure e-mail protocol and network for transmitting PHI. DSM can be obtained from EHR vendors and other health information exchange systems. It was developed and adopted through the Meaningful Use program, and many medical organizations nationwide now use DSM networks. When texting PHI, use a secure texting system."
            },
            {
              "text": "No. We have not considered how to securely transmit ePHI.",
              "riskScore": 0,
              "education": "Implement technical security measures to guard against unauthorized access to ePHI that is transmitted over an electronic communication network in addition to developing protocols and procedures. Consider implementing measures to detect modification of transmitted ePHI; if this is determined to not be reasonable and appropriate, document the reason why along with the compensating control in place. When e-mailing PHI, use a secure messaging application such as Direct Secure Messaging (DSM),which is a nationally adopted secure e-mail protocol and network for transmitting PHI. DSM can be obtained from EHR vendors and other health information exchange systems. It was developed and adopted through the Meaningful Use program, and many medical organizations nationwide now use DSM networks. When texting PHI, use a secure texting system."
            }
          ]
        },
        {
          "id": "27",
          "text": "Have you implemented mechanisms to record activity on information systems that create or use ePHI?",
          "responses": [
            {
              "text": "Yes. Activity on systems that create or use ePHI is recorded and examined through monitoring of audit logs, system logs, or other mechanisms. This is documented in our procedures, including a complete inventory of systems that record activity and how it is examined.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            },
            {
              "text": "Yes. Activity on systems that create or use ePHI is recorded and examined through hardware, software or procedural mechanisms. However, this process is not formally documented in our procedures.",
              "riskScore": 0,
              "education": "Mechanisms used to record and examine activity on information systems that contain or use ePHI should be documented in your security documentation. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            },
            {
              "text": "Yes. Activity on systems that create or use ePHI should be recorded and examined per our procedures, but we do not have actual hardware, software or procedural mechanisms in place.",
              "riskScore": 0,
              "education": "Mechanisms should be in place to record and examine activity on information systems that contain or use ePHI. These mechanisms should be documented in your security documentation. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            },
            {
              "text": "No. We do not have procedures or mechanisms to record and examine activities and information systems that create or use ePHI.",
              "riskScore": 0,
              "education": "Mechanisms should be in place to record and examine activity on information systems that contain or use ePHI. These mechanisms should be documented in your security documentation. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            }
          ]
        },
        {
          "id": "28",
          "text": "Does the organization stay up to date or informed (e.g., cybersecurity listserv monitoring) on emerging threats and vulnerabilities that may affect information systems?",
          "responses": [
            {
              "text": "Yes, the organization subscribes to cybersecurity listservs and other informational sources that supply information regarding legal and regulatory requirements pertaining to cybersecurity emerging threats.",
              "riskScore": 1,
              "education": "This is the most effective option of those provided to track and manage current legal and regulatory requirements on protection of individuals information and understanding emerging cybersecurity threats. Subscribing to notifications from IT authoritative sources on threats and vulnerabilities such as CISA, ISO/IEC, H-ISAC, or IT-ISAC is a starting point for keeping abreast of the most current information available."
            },
            {
              "text": "Yes, the organization receives periodic updates on current or emerging threats but does not follow listservs or other informational sources on a regular basis.",
              "riskScore": 0,
              "education": "The organization should consider regularly monitoring or subscribing to receive information from IT authoritative sources on threats and vulnerabilities such as CISA, ISO/IEC, H-ISAC, or IT-ISAC to stay abreast of rules, regulations, emerging threats, and standards of information security."
            },
            {
              "text": "No, the organization does not subscribe to cybersecurity listservs and other informational sources that supply information regarding legal and regulatory requirements pertaining to cybersecurity emerging threats.",
              "riskScore": 0,
              "education": "The organization should consider regularly monitoring or subscribing to receive information from IT authoritative sources on threats and vulnerabilities such as CISA, ISO/IEC, H-ISAC, or IT-ISAC to stay abreast of rules, regulations, emerging threats, and standards of information security."
            },
            {
              "text": "Flag this question for later",
              "riskScore": 0,
              "education": "This question will be marked as an area for review and will be included in the \"Flagged Questions\" report."
            }
          ]
        },
        {
          "id": "29",
          "text": "Is there a process in place to identify and evaluate information systems for potential emerging technical vulnerabilities and how the exposure could affect systems that contain ePHI?",
          "responses": [
            {
              "text": "Yes, periodic vulnerability scans or penetration testing are done on a regular, scheduled basis to assess network computing and physical and system architecture for weaknesses, and software systems that may have reached their end of life.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to identify potential new threats and vulnerabilities within the information system. Timely information about technical vulnerabilities should be evaluated to identify the organizations exposure to vulnerabilities and appropriate measures should be taken to address the risk. The organization should identify any patch or software configuration and software end of life that needs to be addressed as well as assess all facilities that house critical computing assets for physical vulnerabilities and resilience issues. The organization should monitor sources of cyber threat intelligence for information on new vulnerabilities in products and services and review processes and procedures for weaknesses that could be exploited to affect cybersecurity."
            },
            {
              "text": "Yes, vulnerability scans or penetration testing are done but only on a as needed basis such as when there is a suspected weakness.",
              "riskScore": 0,
              "education": "Timely information about technical vulnerabilities should be evaluated to identify the organizations exposure to vulnerabilities and appropriate measures should be taken to address the risk. The organization should identify any patch or software configuration and software end of life that needs to be addressed as well as assess all facilities that house critical computing assets for physical vulnerabilities and resilience issues. The organization should monitor sources of cyber threat intelligence for information on new vulnerabilities in products and services and review processes and procedures for weaknesses that could be exploited to affect cybersecurity."
            },
            {
              "text": "No, vulnerability testing is not performed.",
              "riskScore": 0,
              "education": "Consider routine testing for technical vulnerabilities so that timely information can be evaluated to identify the organizations exposure to vulnerabilities and appropriate measures should be taken to address the risk. The organization should identify any patch or software configuration and software end of life that needs to be addressed as well as assess all facilities that house critical computing assets for physical vulnerabilities and resilience issues. The organization should monitor sources of cyber threat intelligence for information on new vulnerabilities in products and services and review processes and procedures for weaknesses that could be exploited to affect cybersecurity."
            }
          ]
        },
        {
          "id": "30",
          "text": "If new threats or vulnerabilities are identified through regular scanning, what is done to mitigate and respond to them?",
          "responses": [
            {
              "text": "The organization applies their policy and procedures consistent with the risk assessment to mitigate identified vulnerabilities.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to respond to and mitigate identified risks. The organization applies the policy and procedures consistent with the risk assessment to mitigate any identified vulnerabilities in a risk appropriate way. In addition, the organization tracks the progress of risk response implementation and uses findings to inform risk response decisions and actions."
            },
            {
              "text": "The vulnerabilities are documented formally and no additional action is taken.",
              "riskScore": 0,
              "education": "Consider developing and applying the specific policy and procedures to respond to and mitigate any identified vulnerabilities in a risk appropriate way. In addition, the organization could track and monitor the progress of risk response implementation and uses findings to inform risk response decisions and actions."
            },
            {
              "text": "No additional attention is given to identified threats and vulnerabilities.",
              "riskScore": 0,
              "education": "Consider developing and applying the specific policy and procedures to respond to and mitigate any identified vulnerabilities in a risk appropriate way. In addition, the organization could track and monitor the progress of risk response implementation and uses findings to inform risk response decisions and actions."
            }
          ]
        },
        {
          "id": "1",
          "text": "Inadequate access controls",
          "responses": [
            {
              "text": "Information disclosure, loss, or theft (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disruption of information system function or adversarial access to unauthorized network segments",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Malware installation on information systems or devices",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized modification of sensitive information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Information system access granted to unauthorized persons or entities",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "2",
          "text": "Lack of documentation for controlling user access",
          "responses": [
            {
              "text": "Improper or overly broad assignment of access permissions for users",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Procedures lack sufficient detail for determining user access",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "3",
          "text": "Inadequate procedures for evaluating user activity logs",
          "responses": [
            {
              "text": "Information disclosure or theft (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unknown source of a security/privacy related incident",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Information system access granted to unauthorized personnel",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to or modification of ePHI/sensitive information",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "4",
          "text": "Users have more access rights than needed to complete daily tasks",
          "responses": [
            {
              "text": "Information disclosure or theft (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to ePHI/sensitive information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized modification of critical network systems and data",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "5",
          "text": "Non-unique login credentials for workforce members",
          "responses": [
            {
              "text": "Users violate security rules on information systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unknown or unidentified security incidents or breaches occur",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized user impersonating an authorized user",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "6",
          "text": "Inadequate use of encryption for ePHI",
          "responses": [
            {
              "text": "Disclosure of passwords or login information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Information disclosure, loss, or theft (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Fines from regulatory enforcement (due to lack of encryption safe harbor)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Information system access granted to unauthorized personnel",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to or modification of ePHI/sensitive information",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "7",
          "text": "Inadequate review of computer systems to ensure maximum security",
          "responses": [
            {
              "text": "Accidental modification to ePHI/sensitive information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Denial of service (DoS) to critical systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disclosure of passwords and/or login information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Information disclosure or theft (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Exploitation of unpatched systems and software",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to or modification of ePHI/sensitive information",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "8",
          "text": "Lack of automatic logoff/screen lock of computer systems",
          "responses": [
            {
              "text": "Unauthorized access to information systems or devices",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Malware installation on information systems or devices",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disclosure of passwords and or login information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Denial of service (DoS) to critical systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Accidental modification to ePHI",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Adversary access to unauthorized network segments",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Information disclosure or theft (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Exploitation of unpatched systems and software",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to or modification of ePHI/sensitive information",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "9",
          "text": "Inadequate integrity verification of ePHI",
          "responses": [
            {
              "text": "Accidental modification to ePHI",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Damage to public reputation via misuse of patient chart data",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Inaccurate information given to patients or providers",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized modification to ePHI",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "10",
          "text": "ePHI in transit lacking encryption",
          "responses": [
            {
              "text": "Information disclosure or theft (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to or modification of ePHI/sensitive information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Fines from regulatory enforcement (due to lack of encryption safe harbor)",
              "riskScore": 0,
              "education": ""
            }
          ]
        }
      ]
    },
    {
      "id": "section_5",
      "title": "Section 5 - Security and the Practice",
      "questions": [
        {
          "id": "1",
          "text": "Do you manage access to and use of your facility or facilities (i.e., that house information systems and ePHI)?",
          "responses": [
            {
              "text": "Yes. We have written procedures in place restricting access to and use of our facilities.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Just as network devices need to be secured, physical access to the server and network equipment should be restricted to IT professionals. Configure physical rooms and wireless networks to allow internet access only."
            },
            {
              "text": "Yes. Authorization of access to and use of our facilities is verbally communicated, but we do not have written procedures.",
              "riskScore": 0,
              "education": "Consider implementing documented procedures to govern access to facilities. Just as network devices need to be secured, physical access to the server and network equipment should be restricted to IT professionals. Configure physical rooms and wireless networks to allow internet access only."
            },
            {
              "text": "No. We do not have a process to restrict access to our facilities.",
              "riskScore": 0,
              "education": "Consider implementing documented procedures to govern access to facilities. Just as network devices need to be secured, physical access to the server and network equipment should be restricted to IT professionals. Configure physical rooms and wireless networks to allow internet access only."
            }
          ]
        },
        {
          "id": "2",
          "text": "What physical protections do you have in place to manage facility security risks?",
          "responses": [
            {
              "text": "We have methods for controlling and managing physical access to our facility, such as keypads, locks, and security cameras, as well as documented physical protection assessments in place for each of our facilities. We also have an inventory of our practice's facilities that house equipment that create, maintain, receive, and transmit ePHI. Our policies and procedures outline managements' involvement in facility access control and how authorization credentials for facility access are issued and removed for our workforce members and/or visitors. Workforce members' roles and responsibilities in facility access control procedures are documented and communicated.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Always keep data and network closets locked. Grant access using badge readers rather than traditional key locks. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network. In conference rooms or waiting areas, establish guest networks that separate organizational data and systems. This separation will limit the accessibility of private data from guests visiting the organization. Validate that guest networks are configured to access authorized guest services only."
            },
            {
              "text": "We have written procedures documenting our managements' involvement in facility access control procedures.",
              "riskScore": 0,
              "education": "Ensure only authorized access to ePHI and facilities is allowed by implementing policies and procedures to limit physical access systems and facilities housing ePHI. Consider implementing policies and procedures to safeguard the facility and equipment from unauthorized tampering, theft, or physical access. Always keep data and network closets locked. Grant access using badge readers rather than traditional key locks. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network. In conference rooms or waiting areas, establish guest networks that separate organizational data and systems. This separation will limit the accessibility of private data from guests visiting the organization. Validate that guest networks are configured to access authorized guest services only."
            },
            {
              "text": "We have written procedures documenting how authorization credentials for facility access are issued and removed for our workforce members and/or visitors.",
              "riskScore": 0,
              "education": "Ensure only authorized access to ePHI and facilities is allowed by implementing policies and procedures to limit physical access systems and facilities housing ePHI. Consider implementing policies and procedures to safeguard the facility and equipment from unauthorized tampering, theft, or physical access. Always keep data and network closets locked. Grant access using badge readers rather than traditional key locks. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network. In conference rooms or waiting areas, establish guest networks that separate organizational data and systems. This separation will limit the accessibility of private data from guests visiting the organization. Validate that guest networks are configured to access authorized guest services only."
            },
            {
              "text": "We have methods for controlling and managing physical access to our facility such as, keypads, locks, security cameras, etc.",
              "riskScore": 0,
              "education": "Ensure only authorized access to ePHI and facilities is allowed by implementing policies and procedures to limit physical access systems and facilities housing ePHI. Consider implementing policies and procedures to safeguard the facility and equipment from unauthorized tampering, theft, or physical access. Always keep data and network closets locked. Grant access using badge readers rather than traditional key locks. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network. In conference rooms or waiting areas, establish guest networks that separate organizational data and systems. This separation will limit the accessibility of private data from guests visiting the organization. Validate that guest networks are configured to access authorized guest services only."
            },
            {
              "text": "We have an inventory of our practice's facilities that house equipment that create, maintain, receive, and transmit ePHI.",
              "riskScore": 0,
              "education": "Ensure only authorized access to ePHI and facilities is allowed by implementing policies and procedures to limit physical access systems and facilities housing ePHI. Consider implementing policies and procedures to safeguard the facility and equipment from unauthorized tampering, theft, or physical access. Always keep data and network closets locked. Grant access using badge readers rather than traditional key locks. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network. In conference rooms or waiting areas, establish guest networks that separate organizational data and systems. This separation will limit the accessibility of private data from guests visiting the organization. Validate that guest networks are configured to access authorized guest services only."
            },
            {
              "text": "We do not have physical protections in place to manage facility security risks.",
              "riskScore": 0,
              "education": "Ensure only authorized access to ePHI and facilities is allowed by implementing policies and procedures to limit physical access systems and facilities housing ePHI. Consider implementing policies and procedures to safeguard the facility and equipment from unauthorized tampering, theft, or physical access. Always keep data and network closets locked. Grant access using badge readers rather than traditional key locks. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network. In conference rooms or waiting areas, establish guest networks that separate organizational data and systems. This separation will limit the accessibility of private data from guests visiting the organization. Validate that guest networks are configured to access authorized guest services only."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Ensure only authorized access to ePHI and facilities is allowed by implementing policies and procedures to limit physical access systems and facilities housing ePHI. Consider implementing policies and procedures to safeguard the facility and equipment from unauthorized tampering, theft, or physical access. Always keep data and network closets locked. Grant access using badge readers rather than traditional key locks. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network. In conference rooms or waiting areas, establish guest networks that separate organizational data and systems. This separation will limit the accessibility of private data from guests visiting the organization. Validate that guest networks are configured to access authorized guest services only."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Ensure only authorized access to ePHI and facilities is allowed by implementing policies and procedures to limit physical access systems and facilities housing ePHI. Consider implementing policies and procedures to safeguard the facility and equipment from unauthorized tampering, theft, or physical access. Always keep data and network closets locked. Grant access using badge readers rather than traditional key locks. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network. In conference rooms or waiting areas, establish guest networks that separate organizational data and systems. This separation will limit the accessibility of private data from guests visiting the organization. Validate that guest networks are configured to access authorized guest services only."
            }
          ]
        },
        {
          "id": "3",
          "text": "Do you restrict physical access to and use of your equipment (i.e., equipment that house ePHI)?",
          "responses": [
            {
              "text": "Yes. We have written policies and implemented procedures restricting access to equipment that house ePHI to authorized users only.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Restrict access to assets with potentially high impact in the event of compromise. This includes medical devices and internet of things (IoT) items (e.g., security cameras, badge readers, temperature sensors, building management systems)."
            },
            {
              "text": "Yes. We verbally authorize individuals to access equipment that house ePHI, but no written policies or procedures.",
              "riskScore": 0,
              "education": "Ensure only authorized access to ePHI is allowed by implementing and documenting procedures to govern access to equipment that house ePHI. Restrict access to assets with potentially high impact in the event of compromise. This includes medical devices and internet of things (IoT) items (e.g., security cameras, badge readers, temperature sensors, building management systems)."
            },
            {
              "text": "No. We do not have a process to restrict access to equipment that house ePHI to authorized users.",
              "riskScore": 0,
              "education": "Ensure only authorized access to ePHI is allowed by implementing and documenting procedures to govern access to equipment that house ePHI. Restrict access to assets with potentially high impact in the event of compromise. This includes medical devices and internet of things (IoT) items (e.g., security cameras, badge readers, temperature sensors, building management systems)."
            }
          ]
        },
        {
          "id": "4",
          "text": "Do you manage workforce member, visitor, and third-party access to electronic devices?",
          "responses": [
            {
              "text": "Yes. We have written procedures for classifying electronic devices, based on their capabilities, connection, and allowable activities, and documentation of such classifications as applied to our electronic devices; access to electronic devices by workforce members, visitors, and/or third parties is determined based on their classification.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. In conference rooms or waiting areas, establish guest networks that separate organizational data and systems. This separation will limit the accessibility of private data from guests visiting the organization. Validate that guest networks are configured to access authorized guest services only."
            },
            {
              "text": "Yes. We have written procedures for access to electronic devices, but not detailing all of the variables listed above.",
              "riskScore": 0,
              "education": "With regard to workstation-use and physical security, implement policies and procedures that define how electronic devices are used to access ePHI. In conference rooms or waiting areas, establish guest networks that separate organizational data and systems. This separation will limit the accessibility of private data from guests visiting the organization. Validate that guest networks are configured to access authorized guest services only."
            },
            {
              "text": "Yes. We verbally instruct users on access to electronic devices, but do not have written procedures.",
              "riskScore": 0,
              "education": "With regard to workstation-use and physical security, implement policies and procedures that define how electronic devices are used to access ePHI. In conference rooms or waiting areas, establish guest networks that separate organizational data and systems. This separation will limit the accessibility of private data from guests visiting the organization. Validate that guest networks are configured to access authorized guest services only."
            },
            {
              "text": "No. We do not have a process for managing workforce member, visitor, or third-party access to electronic devices.",
              "riskScore": 0,
              "education": "With regard to workstation-use and physical security, implement policies and procedures that define how electronic devices are used to access ePHI. In conference rooms or waiting areas, establish guest networks that separate organizational data and systems. This separation will limit the accessibility of private data from guests visiting the organization. Validate that guest networks are configured to access authorized guest services only."
            }
          ]
        },
        {
          "id": "5",
          "text": "Do you have physical protections in place, such as cable locks for portable laptops, screen filters for screens visible in high traffic areas, to manage electronic device security risks?",
          "responses": [
            {
              "text": "Yes, we have physical protections in place for all electronic devices. Protections are described in policies and procedures and in documentation assessing the specific protections in place.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Examples include installation of anti-theft cables, locks on rooms where the devices are located, screen protectors or dividers, and the use of badge readers to monitor access to rooms where devices are located. Document these safeguards in your policies and procedures. A small organization's endpoints must be protected. Endpoints include desktops, laptops, mobile devices, and other connected hardware devices (e.g., printers, medical equipment)."
            },
            {
              "text": "Yes. We have some physical protections in place for some, but not all, electronic devices.",
              "riskScore": 0,
              "education": "Implement physical safeguards for all electronic devices that access electronic protected health information, to restrict access to authorized users. Examples include installation of anti-theft cables, locks on rooms where the devices are located, screen protectors or dividers, and the use of badge readers to monitor access to rooms where devices are located. Document these safeguards in your policies and procedures. A small organization's endpoints must be protected. Endpoints include desktops, laptops, mobile devices, and other connected hardware devices (e.g., printers, medical equipment)."
            },
            {
              "text": "No. We do not have physical protections in place for our electronic devices.",
              "riskScore": 0,
              "education": "Implement physical safeguards for all electronic devices that access electronic protected health information, to restrict access to authorized users. Examples include installation of anti-theft cables, locks on rooms where the devices are located, screen protectors or dividers, and the use of badge readers to monitor access to rooms where devices are located. Document these safeguards in your policies and procedures. A small organization's endpoints must be protected. Endpoints include desktops, laptops, mobile devices, and other connected hardware devices (e.g., printers, medical equipment)."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Implement physical safeguards for all electronic devices that access electronic protected health information, to restrict access to authorized users. Examples include installation of anti-theft cables, locks on rooms where the devices are located, screen protectors or dividers, and the use of badge readers to monitor access to rooms where devices are located. Document these safeguards in your policies and procedures. A small organization's endpoints must be protected. Endpoints include desktops, laptops, mobile devices, and other connected hardware devices (e.g., printers, medical equipment)."
            }
          ]
        },
        {
          "id": "6",
          "text": "What physical protections do you have in place for electronic devices with access to ePHI?",
          "responses": [
            {
              "text": "We have robust procedures for electronic device access control, such as authorization for issuing new electronic device access and removing electronic device access. We also use screen filters, docking stations with locks, and/or cable locks for portable devices, privacy screens (walls or partitions), and/or secured proximity for servers and network equipment. Assessments of physical protections in use are documented.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. For devices that cannot be encrypted or that are managed by a third party, implement physical security controls to minimize theft or unauthorized removal. Examples include installation of anti-theft cables, locks on rooms where the devices are located, and the use of badge readers to monitor access to rooms where devices are located. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network."
            },
            {
              "text": "We have limited procedures for electronic device access control including some but not all of those listed above.",
              "riskScore": 0,
              "education": "Consider which physical safeguards to protect access to ePHI can be reasonably and appropriately implemented in your practice. Consider an authorization process for issuing new electronic device access and removing electronic device access, and using screen filters, docking stations with locks, and/or cable locks for portable devices, privacy screens (walls or partitions), and/or secured proximity for servers and network equipment. For devices that cannot be encrypted or that are managed by a third party, implement physical security controls to minimize theft or unauthorized removal. Examples include installation of anti-theft cables, locks on rooms where the devices are located, and the use of badge readers to monitor access to rooms where devices are located. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network."
            },
            {
              "text": "We do not have any physical protections in place for electronic device access to ePHI.",
              "riskScore": 0,
              "education": "Consider which physical safeguards to protect access to ePHI can be reasonably and appropriately implemented in your practice. Consider an authorization process for issuing new electronic device access and removing electronic device access, and using screen filters, docking stations with locks, and/or cable locks for portable devices, privacy screens (walls or partitions), and/or secured proximity for servers and network equipment. For devices that cannot be encrypted or that are managed by a third party, implement physical security controls to minimize theft or unauthorized removal. Examples include installation of anti-theft cables, locks on rooms where the devices are located, and the use of badge readers to monitor access to rooms where devices are located. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider which physical safeguards to protect access to ePHI can be reasonably and appropriately implemented in your practice. Consider an authorization process for issuing new electronic device access and removing electronic device access, and using screen filters, docking stations with locks, and/or cable locks for portable devices, privacy screens (walls or partitions), and/or secured proximity for servers and network equipment. For devices that cannot be encrypted or that are managed by a third party, implement physical security controls to minimize theft or unauthorized removal. Examples include installation of anti-theft cables, locks on rooms where the devices are located, and the use of badge readers to monitor access to rooms where devices are located. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Consider which physical safeguards to protect access to ePHI can be reasonably and appropriately implemented in your practice. Consider an authorization process for issuing new electronic device access and removing electronic device access, and using screen filters, docking stations with locks, and/or cable locks for portable devices, privacy screens (walls or partitions), and/or secured proximity for servers and network equipment. For devices that cannot be encrypted or that are managed by a third party, implement physical security controls to minimize theft or unauthorized removal. Examples include installation of anti-theft cables, locks on rooms where the devices are located, and the use of badge readers to monitor access to rooms where devices are located. Disable physical network ports that are not in use. Maintain physical network ports as inactive until an activation request is authorized. This minimizes the risk of an unauthorized user \"plugging in\" to an empty port to access to your network."
            }
          ]
        },
        {
          "id": "7",
          "text": "Do you keep an inventory and a location record of all electronic devices?",
          "responses": [
            {
              "text": "Yes. Our inventory list of all electronic devices and their functions is currently documented and updated on a periodic basis.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. A complete and accurate inventory of the Information Technology (IT) and Operational Technology (OT) assets in your organization facilitates the implementation of optimal security controls. This inventory can be conducted and maintained using a well-designed spreadsheet."
            },
            {
              "text": "Yes. We have a list of electronic devices and their functions but it has not been updated to reflect inventory changes.",
              "riskScore": 0,
              "education": "Asset (electronic devices) inventory lists should be kept up-to-date to meet compliance and best practice standards. A complete and accurate inventory of the Information Technology (IT) and Operational Technology (OT) assets in your organization facilitates the implementation of optimal security controls. This inventory can be conducted and maintained using a well-designed spreadsheet."
            },
            {
              "text": "No. We currently do not document and keep an active list of electronic devices and their functions.",
              "riskScore": 0,
              "education": "Your practice may not be aware of threats to devices in use if your practice is not aware of the location of all of its electronic devices, laptops, printers, copiers, tablets, smart phones, monitors, and other electronic devices. ePHI can be exposed in a surrounding or environment that is not suitable for handling or accessing that information. A complete and accurate inventory of the Information Technology (IT) and Operational Technology (OT) assets in your organization facilitates the implementation of optimal security controls. This inventory can be conducted and maintained using a well-designed spreadsheet."
            }
          ]
        },
        {
          "id": "8",
          "text": "Do you have an authorized user who approves access levels within information systems and locations that use ePHI?",
          "responses": [
            {
              "text": "Yes. We have written procedures outlining who has the authorization to approve access to information systems, location, and ePHI; how access requests are submitted and how access is granted.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            },
            {
              "text": "Yes. We have written procedures in place describing determination of user access levels to information systems, locations, and ePHI, but not detailing all of the variables described above.",
              "riskScore": 0,
              "education": "Consider assigning an authorized user to approve access levels with information systems and locations that contain and use ePHI. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            },
            {
              "text": "Yes. We have a verbally communicated process for determining access to information systems, locations, and ePHI.",
              "riskScore": 0,
              "education": "Consider assigning an authorized user to approve access levels with information systems and locations that contain and use ePHI. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            },
            {
              "text": "No. We do not have procedures to determine user access levels to information systems, locations, and ePHI.",
              "riskScore": 0,
              "education": "Consider assigning an authorized user to approve access levels with information systems and locations that contain and use ePHI. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control. Describe cybersecurity roles and responsibilities throughout the organization, including who is responsible for implementing security practices and setting and establishing policy."
            }
          ]
        },
        {
          "id": "9",
          "text": "Do you validate a person's access to facilities (including workforce members and visitors) based on their role or function?",
          "responses": [
            {
              "text": "Yes. We have procedures for validating access to our facility. Access levels are based on role or function. We also have strict requirements for validating workforce members or visitors who seek access to our critical systems and software programs.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Just as network devices need to be secured, physical access to the server and network equipment should be restricted to IT professionals. Configure physical rooms and wireless networks to allow internet access only."
            },
            {
              "text": "Yes. We have procedures for validating a person's access to our facility. Access levels are not based on role or function.",
              "riskScore": 0,
              "education": "Access to facilities, especially areas which house ePHI, should be limited to the minimum amount necessary for workforce members or visitors to complete their legitimate functions. Consider implementing procedures to validate a person's access to facilities based on their role. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control. Just as network devices need to be secured, physical access to the server and network equipment should be restricted to IT professionals. Configure physical rooms and wireless networks to allow internet access only."
            },
            {
              "text": "Yes. We have procedures for validating a person's access to the facility based on their role or function, but do not have additional validation requirements for access to our critical systems.",
              "riskScore": 0,
              "education": "Access to facilities, especially areas which house ePHI, should be limited to the minimum amount necessary for workforce members or visitors to complete their legitimate functions. Consider implementing procedures to validate a person's access to facilities based on their role. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control. Just as network devices need to be secured, physical access to the server and network equipment should be restricted to IT professionals. Configure physical rooms and wireless networks to allow internet access only."
            },
            {
              "text": "Yes. We have an informal process for validating a person's access to facilities, with no written procedures in place.",
              "riskScore": 0,
              "education": "Access to facilities, especially areas which house ePHI, should be limited to the minimum amount necessary for workforce members or visitors to complete their legitimate functions. Consider implementing procedures to validate a person's access to facilities based on their role. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control. Just as network devices need to be secured, physical access to the server and network equipment should be restricted to IT professionals. Configure physical rooms and wireless networks to allow internet access only."
            },
            {
              "text": "No. We do not have a process for validating a person's access to facilities.",
              "riskScore": 0,
              "education": "Access to facilities, especially areas which house ePHI, should be limited to the minimum amount necessary for workforce members or visitors to complete their legitimate functions. Consider implementing procedures to validate a person's access to facilities based on their role. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control. Just as network devices need to be secured, physical access to the server and network equipment should be restricted to IT professionals. Configure physical rooms and wireless networks to allow internet access only."
            }
          ]
        },
        {
          "id": "10",
          "text": "How do you validate a person's access to your facility?",
          "responses": [
            {
              "text": "We maintain lists of authorized persons and have controls in place to identify access attempts. We grant access only to authorized persons.",
              "riskScore": 1,
              "education": "These are effective means of validating facility access. Always keep data and network closets locked. Consider issuing keys marked \"do not duplicate\" or use keypad entry or badge readers for access."
            },
            {
              "text": "We have controls in place to identify persons attempting to access the practice, grant access to authorized persons, and prevent access by unauthorized persons but do not maintain documentation of who is authorized.",
              "riskScore": 0,
              "education": "Consider appropriate methods of validating access to your facility. Implement and document safeguards determined to be reasonable and appropriate. Always keep data and network closets locked. Consider issuing keys marked \"do not duplicate\" or use keypad entry or badge readers for access. Maintain lists of authorized persons and their access, and document procedures for removing or modifying access."
            },
            {
              "text": "We maintain lists of authorized persons but do not have controls in place to identify persons attempting to access the practice, grant access to authorized persons, or prevent access by unauthorized persons.",
              "riskScore": 0,
              "education": "Consider appropriate methods of validating access to your facility. Implement and document safeguards determined to be reasonable and appropriate. Always keep data and network closets locked. Consider issuing keys marked \"do not duplicate\" or use keypad entry or badge readers for access. Maintain lists of authorized persons and their access, and document procedures for removing or modifying access."
            },
            {
              "text": "We maintain lists of authorized persons and have controls in place to identify persons attempting to access the practice, but not to grant access to authorized persons or prevent access by unauthorized persons.",
              "riskScore": 0,
              "education": "Consider appropriate methods of validating access to your facility. Implement and document safeguards determined to be reasonable and appropriate. Always keep data and network closets locked. Consider issuing keys marked \"do not duplicate\" or use keypad entry or badge readers for access. Maintain lists of authorized persons and their access, and document procedures for removing or modifying access."
            },
            {
              "text": "We maintain lists of authorized persons and have controls in place to grant access to authorized persons or prevent access by unauthorized persons, but not to identify persons attempting to access the practice",
              "riskScore": 0,
              "education": "Consider appropriate methods of validating access to your facility. Implement and document safeguards determined to be reasonable and appropriate. Always keep data and network closets locked. Consider issuing keys marked \"do not duplicate,\" or use keypad entry or badge readers for access. Maintain lists of authorized persons and their access, and document procedures for removing or modifying access."
            },
            {
              "text": "We do not have lists of authorized persons or controls in place to identify persons attempting to access the practice, grant access to authorized persons, or prevent access by unauthorized persons.",
              "riskScore": 0,
              "education": "Consider appropriate methods of validating access to your facility. Implement and document safeguards determined to be reasonable and appropriate. Always keep data and network closets locked. Consider issuing keys marked \"do not duplicate\" or use keypad entry or badge readers for access. Maintain lists of authorized persons and their access, and document procedures for removing or modifying access."
            }
          ]
        },
        {
          "id": "11",
          "text": "Do you have access validation requirements for personnel and visitors seeking access to your critical systems (such as IT/OT, software developers, or network admins)?",
          "responses": [
            {
              "text": "Yes and assessments of access validation processes currently in use are documented.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Just as you might restrict physical access to different parts of your medical office, it is important to restrict the access of third-party entities, including vendors, to separate networks. Allow them to connect only through tightly controlled interfaces. This limits the exposure to and impact of cyberattacks on both your organization and on the third-party entity."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider implementing procedures to validate a person's access to critical systems based on their role or function. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control. Just as you might restrict physical access to different parts of your medical office, it is important to restrict the access of third-party entities, including vendors, to separate networks. Allow them to connect only through tightly controlled interfaces. This limits the exposure to and impact of cyberattacks on both your organization and on the third-party entity."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider implementing procedures to validate a person's access to critical systems based on their role or function. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control. Just as you might restrict physical access to different parts of your medical office, it is important to restrict the access of third-party entities, including vendors, to separate networks. Allow them to connect only through tightly controlled interfaces. This limits the exposure to and impact of cyberattacks on both your organization and on the third-party entity."
            }
          ]
        },
        {
          "id": "12",
          "text": "Does this include controlling access to your software programs for testing and revisions?",
          "responses": [
            {
              "text": "Yes and assessments of processes used to control access to software for testing and revisions are documented.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider implementing procedures to validate a person's access to software programs based on their role or function. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider implementing procedures to validate a person's access to software programs based on their role or function. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control."
            }
          ]
        },
        {
          "id": "13",
          "text": "Do you have procedures for validating a third-party person's access to the facility based on their role or function?",
          "responses": [
            {
              "text": "Yes and assessments of processes used to validate third-party facility access are documented.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Just as you might restrict physical access to different parts of your medical office, it is important to restrict the access of third-party entities, including vendors, to separate networks. Allow them to connect only through tightly controlled interfaces. This limits the exposure to and impact of cyberattacks on both your organization and on the third-party entity."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider implementing procedures to validate a third-party person's access to facilities based on their role or function. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control. Just as you might restrict physical access to different parts of your medical office, it is important to restrict the access of third-party entities, including vendors, to separate networks. Allow them to connect only through tightly controlled interfaces. This limits the exposure to and impact of cyberattacks on both your organization and on the third-party entity."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider implementing procedures to validate a third-party person's access to facilities based on their role or function. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control. Just as you might restrict physical access to different parts of your medical office, it is important to restrict the access of third-party entities, including vendors, to separate networks. Allow them to connect only through tightly controlled interfaces. This limits the exposure to and impact of cyberattacks on both your organization and on the third-party entity."
            }
          ]
        },
        {
          "id": "14",
          "text": "Do you have hardware, software, or other mechanisms that record and examine activity on information systems with access to ePHI?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Implement and document mechanisms to record and examine system activity to ensure your practice is secure systems that contain or use ePHI. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Implement and document mechanisms to record and examine system activity to ensure your practice is secure systems that contain or use ePHI. Implement single sign-on systems that automatically manage access to all software and tools once users have signed onto the network. Such systems allow the organization to centrally maintain and monitor access."
            }
          ]
        },
        {
          "id": "15",
          "text": "What requirements, mechanisms, or controls are in place for retention of audit reports?",
          "responses": [
            {
              "text": "Our practice retains records of audit report review for a minimum of six (6) years, consistent with retention requirements for all information security documentation.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Your state or jurisdiction may have additional requirements beyond the six (6) year retention requirement."
            },
            {
              "text": "Requirements are in place to retain records of audit report review, but not for a minimum of six (6) years.",
              "riskScore": 0,
              "education": "Records of audit report review should be retained for a minimum of six (6) years. Your state or jurisdiction may have additional requirements beyond the six (6) year retention requirement."
            },
            {
              "text": "Requirements are not in place to retain records of audit report review.",
              "riskScore": 0,
              "education": "Records of audit report review should be retained for a minimum of six (6) years. Your state or jurisdiction may have additional requirements beyond the six (6) year retention requirement."
            }
          ]
        },
        {
          "id": "16",
          "text": "Do you maintain records of physical changes upgrades, and modifications to your facility?",
          "responses": [
            {
              "text": "Yes. We have written procedures to document modifications to our facility. This includes documenting when physical security component repairs, modifications, or updates are needed and our workforce members' roles and responsibilities in that process. Any changes to our facility's security components go through an authorization process.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "Yes. We have written procedures to document modifications to our facility. This includes documenting when physical security component repairs, modifications, or updates are needed. Any changes to our facility's security components go through an authorization process.",
              "riskScore": 0,
              "education": "Consider including in your procedural documentation what your workforce members' roles and responsibilities are in the repair and modification of physical security components within your facility. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control."
            },
            {
              "text": "Yes. We have written procedures to document modifications to our facility. This includes documenting when physical security component repairs, modifications, or updates are needed.",
              "riskScore": 0,
              "education": "Consider including in your procedural documentation workforce members' roles and responsibilities as well as the authorization process for making repairs, modifications, and updates to your facility's physical security components. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control."
            },
            {
              "text": "No. We communicate and verbally authorize when repairs, modifications, or upgrades to the facility's physical security components are needed, but we do not have written procedures for this process.",
              "riskScore": 0,
              "education": "Consider including in your procedural documentation workforce members' roles and responsibilities as well as the authorization process for making repairs, modifications, and updates to your facility's physical security components. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control."
            },
            {
              "text": "No. We do not maintain a log of changes, upgrades, or modifications to our facility.",
              "riskScore": 0,
              "education": "Consider including in your procedural documentation workforce members' roles and responsibilities as well as the authorization process for making repairs, modifications, and updates to your facility's physical security components. If this is determined to not be reasonable and appropriate, document the reason why and implement a compensating control."
            }
          ]
        },
        {
          "id": "17",
          "text": "How do you maintain awareness of the movement of electronic devices and media?",
          "responses": [
            {
              "text": "We maintain a detailed inventory of all electronic devices and media which contain ePHI, including where they are located, which workforce members are authorized to access or possess the devices, and to where they are moved.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Although it can be difficult to implement and sustain IT/OT asset management processes, such processes should be part of daily IT/OT operations and encompass the lifecycle of each IT or OT asset, including procurement, deployment, maintenance, and decommissioning (i.e., replacement or disposal) of the device."
            },
            {
              "text": "We keep a basic list of devices but do not formally track their movement.",
              "riskScore": 0,
              "education": "Devices should be tracked according to which workforce members have access to or possession of them, where they are located, and where they are moved. Although it can be difficult to implement and sustain IT/OT asset management processes, such processes should be part of daily IT/OT operations and encompass the lifecycle of each IT or OT asset, including procurement, deployment, maintenance, and decommissioning (i.e., replacement or disposal) of the device."
            },
            {
              "text": "We rely on personal memory to maintain awareness of device location, movement, and access authorization.",
              "riskScore": 0,
              "education": "Devices should be tracked according to which workforce members have access to or possession of them, where they are located, and where they are moved. Although it can be difficult to implement and sustain IT/OT asset management processes, such processes should be part of daily IT/OT operations and encompass the lifecycle of each IT or OT asset, including procurement, deployment, maintenance, and decommissioning (i.e., replacement or disposal) of the device."
            }
          ]
        },
        {
          "id": "18",
          "text": "Do you back up ePHI to ensure availability when devices are moved?",
          "responses": [
            {
              "text": "Yes. Our critical data and ePHI is centrally stored (such as in a cloud or active directory server) that can be accessed from any authorized device.",
              "riskScore": 1,
              "education": "This is an effective option to protect the confidentiality, integrity, and availability of ePHI. Make sure backups will be available and functional when needed through periodic testing. Train staff never to back up data on uncontrolled storage devices or personal cloud services. Leveraging the cloud for backup purposes is acceptable if you have established an agreement with the cloud vendor and verified the security of the vendor's systems."
            },
            {
              "text": "Yes. We manage our own backups of all critical ePHI (using portable storage devices) that enables continued access during device movement.",
              "riskScore": 0,
              "education": "This is an effective option to protect the confidentiality, integrity, and availability of ePHI. Make sure backups will be available and functional when needed through periodic testing. Train staff never to back up data on uncontrolled storage devices or personal cloud services. Leveraging the cloud for backup purposes is acceptable if you have established an agreement with the cloud vendor and verified the security of the vendor's systems."
            },
            {
              "text": "No. We do not ensure that data will be available when stored on a removed device.",
              "riskScore": 0,
              "education": "ePHI can be lost, corrupted, or made inaccessible in the future if your practice does not create backup files that are retrievable and exact copies. Make sure backups will be available and functional when needed through periodic testing. Train staff never to back up data on uncontrolled storage devices or personal cloud services. Leveraging the cloud for backup purposes is acceptable if you have established an agreement with the cloud vendor and verified the security of the vendor's systems."
            }
          ]
        },
        {
          "id": "19",
          "text": "Do you ensure devices which created, maintained, received, or transmitted ePHI are effectively sanitized when they are disposed of?",
          "responses": [
            {
              "text": "Yes. We remove any data storage or memory component from the device and then store it in a secure location. Data is wiped from the device prior to disposing of the device using a method that conforms to guidelines in NIST SP 800-88 and OCR Guidance to Render Unsecured Protected Health Information Unusable, Unreadable, or Indecipherable to Unauthorized Individuals.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Although it can be difficult to implement and sustain IT/OT asset management processes, such processes should be part of daily IT/OT operations and encompass the lifecycle of each IT or OT asset, including procurement, deployment, maintenance, and decommissioning (i.e., replacement or disposal) of the device."
            },
            {
              "text": "Yes. Devices are given to a third-party, which wipes the data and disposes of the devices appropriately using a method that conforms to guidelines in NIST SP 800-88 and OCR Guidance to Render Unsecured Protected Health Information Unusable, Unreadable, or Indecipherable to Unauthorized Individuals. We are provided a certificate of destruction outlining the specific devices that were disposed of whenever this is performed.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Although it can be difficult to implement and sustain IT/OT asset management processes, such processes should be part of daily IT/OT operations and encompass the lifecycle of each IT or OT asset, including procurement, deployment, maintenance, and decommissioning (i.e., replacement or disposal) of the device."
            },
            {
              "text": "Devices are given to a third-party, which wipes the data and disposes of the devices appropriately. We are not provided a certificate of destruction to confirm appropriate disposal.",
              "riskScore": 0,
              "education": "Third parties should provide documentation certifying that equipment has been properly disposed of. Although it can be difficult to implement and sustain IT/OT asset management processes, such processes should be part of daily IT/OT operations and encompass the lifecycle of each IT or OT asset, including procurement, deployment, maintenance, and decommissioning (i.e., replacement or disposal) of the device."
            },
            {
              "text": "We maintain a secure area where items are stored prior to disposal, and this is documented in our asset inventory listing.",
              "riskScore": 0,
              "education": "ePHI on these devices should be purged using a method that conforms to guidelines in NIST SP 800-88 and OCR Guidance to Render Unsecured Protected Health Information Unusable, Unreadable, or Indecipherable to Unauthorized Individuals. Although it can be difficult to implement and sustain IT/OT asset management processes, such processes should be part of daily IT/OT operations and encompass the lifecycle of each IT or OT asset, including procurement, deployment, maintenance, and decommissioning (i.e., replacement or disposal) of the device."
            },
            {
              "text": "No. We place unused devices out of normal work areas but these are not secured.",
              "riskScore": 0,
              "education": "Unused and old equipment should be stored in a secure area if it contains/contained ePHI. ePHI on these devices should be purged using a method that conforms to guidelines in NIST SP 800-88 and OCR Guidance to Render Unsecured Protected Health Information Unusable, Unreadable, or Indecipherable to Unauthorized Individuals. Although it can be difficult to implement and sustain IT/OT asset management processes, such processes should be part of daily IT/OT operations and encompass the lifecycle of each IT or OT asset, including procurement, deployment, maintenance, and decommissioning (i.e., replacement or disposal) of the device."
            },
            {
              "text": "No. We do not have procedures for the disposal of devices and media.",
              "riskScore": 0,
              "education": "ePHI can be removed from your facilities without being observed and/or monitored if your practice does not have security policies and procedures to physically protect and securely store electronic devices and media. ePHI on these devices should be purged using a method that conforms to guidelines in NIST SP 800-88 and OCR Guidance to Render Unsecured Protected Health Information Unusable, Unreadable, or Indecipherable to Unauthorized Individuals. Although it can be difficult to implement and sustain IT/OT asset management processes, such processes should be part of daily IT/OT operations and encompass the lifecycle of each IT or OT asset, including procurement, deployment, maintenance, and decommissioning (i.e., replacement or disposal) of the device."
            }
          ]
        },
        {
          "id": "20",
          "text": "How do you determine what is considered appropriate use of electronic devices and connected network devices?",
          "responses": [
            {
              "text": "We have documented policies and procedures in place outlining proper functions to be performed on electronic devices and devices (e.g., whether or not they should access ePHI), how those functions will be performed, who is authorized to use the devices, and the physical surroundings of the devices.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            },
            {
              "text": "We verbally communicate appropriate use of equipment but do not have requirements outlined in writing.",
              "riskScore": 0,
              "education": "Develop policies and procedures to enforce access control policies that define the appropriate use and surroundings of information systems, electronic devices, and other electronic devices that contain ePHI (such as laptops, printers, copiers, tablets, smart phones, monitors, and other devices). As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            },
            {
              "text": "We do not have any policies or procedures outlining appropriate use of electronic devices and connected devices.",
              "riskScore": 0,
              "education": "Workforce members, business associates, services providers, and the general public may not be aware of how to use devices appropriately, or how to secure those devices physically, if your practice does not implement policies and procedures that define expectations for proper use. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            }
          ]
        },
        {
          "id": "21",
          "text": "Do you ensure access to ePHI is terminated when employment or other arrangements with the workforce member ends?",
          "responses": [
            {
              "text": "Yes. We have written procedures documenting termination or change of access to ePHI upon termination or change of employment, including recovery of access control devices (including organization-owned devices, media, and equipment), deactivation of information system access, appropriate changes in access levels and/or privileges pursuant to job description changes that necessitate more or less access to ePHI, time frames to terminate access to ePHI, and exit interviews that include a discussion of privacy and security topics regarding ePHI.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. When an employee leaves your organization, ensure that procedures are executed to terminate the employee's access immediately. Prompt user termination prevents former employees from accessing patient data and other sensitive information after they have left the organization. This is very important for organizations that use cloud-based systems where access is based on credentials, rather than physical presence at a particular computer. Similarly, if an employee changes jobs within the organization, it is important to terminate access related to the employee's former position before granting access based on the requirements for the new position."
            },
            {
              "text": "Yes. We have written procedures documenting termination or change of access to ePHI upon termination or change of employment, but not detailing all of the variables listed above.",
              "riskScore": 0,
              "education": "Changes to access to ePHI should be documented in the event of device recovery, deactivation of user access, and changes in access levels or privileges. Policy documentation should include details on how the process is completed. When an employee leaves your organization, ensure that procedures are executed to terminate the employee's access immediately. Prompt user termination prevents former employees from accessing patient data and other sensitive information after they have left the organization. This is very important for organizations that use cloud-based systems where access is based on credentials, rather than physical presence at a particular computer. Similarly, if an employee changes jobs within the organization, it is important to terminate access related to the employee's former position before granting access based on the requirements for the new position."
            },
            {
              "text": "Yes. We have a verbal process to ensure access to ePHI is changed or terminated as needed, but no written procedures.",
              "riskScore": 0,
              "education": "Changes to access to ePHI should be documented in the event of device recovery, deactivation of user access, and changes in access levels or privileges. Policy documentation should include details on how the process is completed. When an employee leaves your organization, ensure that procedures are executed to terminate the employee's access immediately. Prompt user termination prevents former employees from accessing patient data and other sensitive information after they have left the organization. This is very important for organizations that use cloud-based systems where access is based on credentials, rather than physical presence at a particular computer. Similarly, if an employee changes jobs within the organization, it is important to terminate access related to the employee's former position before granting access based on the requirements for the new position."
            },
            {
              "text": "No. We do not have a process to ensure access to ePHI is changed or terminated as needed.",
              "riskScore": 0,
              "education": "Individuals without a need to know can access your practice's ePHI if it does not have documented policies and procedures for terminating authorized access to its facilities, information systems, and ePHI once the need for access no longer exists. When an employee leaves your organization, ensure that procedures are executed to terminate the employee's access immediately. Prompt user termination prevents former employees from accessing patient data and other sensitive information after they have left the organization. This is very important for organizations that use cloud-based systems where access is based on credentials, rather than physical presence at a particular computer. Similarly, if an employee changes jobs within the organization, it is important to terminate access related to the employee's former position before granting  access based on the requirements for the new position."
            }
          ]
        },
        {
          "id": "22",
          "text": "Do you have procedures for terminating or changing third-party access across your organization when the contract, business associate agreement, or other arrangement with the third party ends or is changed?",
          "responses": [
            {
              "text": "Yes",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. When a contract with a business associate or third party is terminated, ensure that procedures are executed to terminate the access immediately. Prompt user termination prevents business associates or third parties from accessing patient data and other sensitive information after the contract is terminated with the organization. This is very important for organizations that use cloud-based systems where access is based on credentials, rather than physical presence at a particular computer."
            },
            {
              "text": "No",
              "riskScore": 0,
              "education": "Ensure that access to ePHI by third parties is terminated or changed appropriately when your contractual relationship with them ends or changes. When a contract with a business associate or third party is terminated, ensure that procedures are executed to terminate the access immediately. Prompt user termination prevents business associates or third parties from accessing patient data and other sensitive information after the contract is terminated with the organization. This is very important for organizations that use cloud-based systems where access is based on credentials, rather than physical presence at a particular computer."
            }
          ]
        },
        {
          "id": "23",
          "text": "How do you ensure media is sanitized prior to re-use?",
          "responses": [
            {
              "text": "We have a process to completely purge data from all devices prior to re-use through device reimaging, degaussing, or other industry standard method; our method conforms to guidelines in NIST SP 800-88 and OCR Guidance to Render Unsecured Protected Health Information Unusable, Unreadable, or Indecipherable to Unauthorized Individuals.",
              "riskScore": 1,
              "education": "This is an effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Ensure that obsolete data are removed or destroyed properly so they cannot be accessed by cyber-thieves. Just as paper medical and financial records must be fully destroyed by shredding or burning, digital data must be properly disposed of to ensure that they cannot be inappropriately recovered. Discuss options for properly disposing of outdated or unneeded data with your IT support. Create and document policies and procedures that outline the process by which media is sanitized prior to disposal. Do not assume that deleting or erasing files means that the data are destroyed."
            },
            {
              "text": "We sometimes remove ePHI from devices using a method that conforms to guidelines in NIST SP 800-88 and OCR Guidance to Render Unsecured Protected Health Information Unusable, Unreadable, or Indecipherable to Unauthorized Individuals, but not always, prior to re-use.",
              "riskScore": 0,
              "education": "Implement procedures for removal of ePHI from electronic media before the media are made available for re-use. Ensure that obsolete data are removed or destroyed properly so they cannot be accessed by cyber-thieves. Just as paper medical and financial records must be fully destroyed by shredding or burning, digital data must be properly disposed of to ensure that they cannot be inappropriately recovered. Discuss options for properly disposing of outdated or unneeded data with your IT support. Create and document policies and procedures that outline the process by which media is sanitized prior to disposal. Do not assume that deleting or erasing files means that the data are destroyed."
            },
            {
              "text": "We delete files with ePHI from devices but do not do anything else to purge data prior to re-use.",
              "riskScore": 0,
              "education": "Deleting files does not fully purge data from the device. Implement procedures for removal of ePHI from electronic media before the media are made available for re-use. Ensure that obsolete data are removed or destroyed properly so they cannot be accessed by cyber-thieves. Just as paper medical and financial records must be fully destroyed by shredding or burning, digital data must be properly disposed of to ensure that they cannot be inappropriately recovered. Discuss options for properly disposing of outdated or unneeded data with your IT support. Create and document policies and procedures that outline the process by which media is sanitized prior to disposal. Do not assume that deleting or erasing files means that the data are destroyed."
            },
            {
              "text": "We do not have a process to remove ePHI from devices prior to re-use.",
              "riskScore": 0,
              "education": "Implement procedures for removal of ePHI from electronic media before the media are made available for re-use. Ensure that obsolete data are removed or destroyed properly so they cannot be accessed by cyber-thieves. Just as paper medical and financial records must be fully destroyed by shredding or burning, digital data must be properly disposed of to ensure that they cannot be inappropriately recovered. Discuss options for properly disposing of outdated or unneeded data with your IT support. Create and document policies and procedures that outline the process by which media is sanitized prior to disposal. Do not assume that deleting or erasing files means that the data are destroyed."
            },
            {
              "text": "We have a third-party business associate sanitize devices for the practice prior to their re-use. The business associate does not provide a certificate of proper disposal identifying the sanitized devices individually (e.g., with serial numbers).",
              "riskScore": 0,
              "education": "Document procedures for removal of ePHI from electronic media before the media are made available for re-use. Make sure your practice maintains detailed records of the sanitization performed and have a BAA in place with the business associate. Ensure that obsolete data are removed or destroyed properly so they cannot be accessed by cyber-thieves. Just as paper medical and financial records must be fully destroyed by shredding or burning, digital data must be properly disposed of to ensure that they cannot be inappropriately recovered. Discuss options for properly disposing of outdated or unneeded data with your IT support. Create and document policies and procedures that outline the process by which media is sanitized prior to disposal. Do not assume that deleting or erasing files means that the data are destroyed."
            },
            {
              "text": "We have a third-party business associate sanitize devices for the practice prior to their re-use. The business associate always provide a certificate of proper disposal identifying the sanitized devices individually (e.g., with serial numbers).",
              "riskScore": 1,
              "education": "This is an effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Ensure that obsolete data are removed or destroyed properly so they cannot be accessed by cyber-thieves. Just as paper medical and financial records must be fully destroyed by shredding or burning, digital data must be properly disposed of to ensure that they cannot be inappropriately recovered. Discuss options for properly disposing of outdated or unneeded data with your IT support. Create and document policies and procedures that outline the process by which media is sanitized prior to disposal. Do not assume that deleting or erasing files means that the data are destroyed."
            }
          ]
        },
        {
          "id": "1",
          "text": "Inadequate facility access management procedures where information systems reside",
          "responses": [
            {
              "text": "Unauthorized access to facility occurs undetected",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Workforce and visitors access critical or sensitive business areas without authorization",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Increased response time to respond to facility security incidents",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Inconsistency in granting access to facilities",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "2",
          "text": "Inadequate physical protection for information systems",
          "responses": [
            {
              "text": "Access allowed by unauthorized personnel",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Adversary access to unauthorized network segments (via wireless penetration or USB/removable media)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Insider tampering of sensitive network equipment",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disruption of business processes, information system function, and/or prolonged adversarial presence within information systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Information disclosure or theft (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Exploitation of unpatched systems and software",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to or modification of ePHI/sensitive information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Adversarial sniffing/wiretapping/eavesdropping on network traffic",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "3",
          "text": "Undocumented location of equipment or assets",
          "responses": [
            {
              "text": "Unconfirmed identity of connected physical devices/equipment",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized devices gaining access to the network",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unconfirmed identity of connected devices/equipment",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Exploitation of unsecured computer systems",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "4",
          "text": "Inadequate access controls for business associate and vendor access",
          "responses": [
            {
              "text": "Adversary leverages third-party access to gain access to facility and devices",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Adversary leverages third-party permissions or credentials to access data or assets",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Uncontrolled access used to disrupt or steal equipment or data",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Damage to public reputation due to breach",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "ePHI accessed by unauthorized entities",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Inability to confirm identity of visitor throughout the facility",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Inability to monitor physical location of business associates and vendors within the facility",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Tampering of sensitive network equipment",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "5",
          "text": "Inadequate sanitation of media",
          "responses": [
            {
              "text": "Information disclosure or theft (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disclosure of passwords and or login information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to ePHI/sensitive information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unknown disposition of unused devices and data",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized modification of user accounts and/or permissions",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "6",
          "text": "Inadequate procedures for proper workstation and connected network device security",
          "responses": [
            {
              "text": "Appropriate security settings may not be applied to all devices/equipment",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized connected devices/equipment on the network",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to or modification of ePHI/sensitive information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Information disclosure or theft (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Workstations or devices tampered with, lost, or destroyed",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "7",
          "text": "Failure to ensure user accounts are configured with appropriate permissions",
          "responses": [
            {
              "text": "Access granted to and maintained by unauthorized persons",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Adversary gaining access to unauthorized areas of the facility",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Adversary retains presence within or access to information systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Damage to public reputation due to breach",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disclosure of passwords and or login information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "ePHI shared with business associates/vendors improperly",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Exploiting unpatched systems and software",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Tampering of sensitive network equipment",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to ePHI",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to sensitive information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized modification to ePHI",
              "riskScore": 0,
              "education": ""
            }
          ]
        }
      ]
    },
    {
      "id": "section_6",
      "title": "Section 6 - Security and Business Associates",
      "questions": [
        {
          "id": "1",
          "text": "Do you contract with business associates or other third-party vendors?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "Make sure all business associates and third-party vendors have been evaluated to determine whether or not they require a Business Associate Agreement."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "If you don't have expertise to perform operational, security, or other tasks, contracting with third-party vendors and business associates can augment your practice's capabilities."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "If you don't have expertise to perform operational, security, or other tasks, contracting with third-party vendors and business associates can augment your practice's capabilities."
            }
          ]
        },
        {
          "id": "2",
          "text": "Do you allow third-party vendors to access your information systems and/or ePHI?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "Make sure all business associates and third-party vendors have been evaluated to determine whether or not they require a Business Associate Agreement. User accounts enable organizations to control and monitor each user's access to and activities on devices, EHRs, e-mail, and other third-party software systems. It is essential to protect user accounts to mitigate the risk of cyber threats."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Working with business associates and third-party vendors can be beneficial to your practice, as long as reasonable and appropriate security precautions are taken for business associates accessing ePHI. User accounts enable organizations to control and monitor each user's access to and activities on devices, EHRs, e-mail, and other third-party software systems. It is essential to protect user accounts to mitigate the risk of cyber threats."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider looking into whether your practice allows business associates or third-party vendors to access your information systems. Your practice may be at risk and unable to safeguard your ePHI if unauthorized third parties have access to your information systems. User accounts enable organizations to control and monitor each user's access to and activities on devices, EHRs, e-mail, and other third-party software systems. It is essential to protect user accounts to mitigate the risk of cyber threats."
            }
          ]
        },
        {
          "id": "3",
          "text": "How do you identify which third-party vendors are business associates and need to create, receive, maintain, or transmit ePHI?",
          "responses": [
            {
              "text": "We review third-party vendor contracts to determine which vendors or contractors require access to ePHI and we include a Business Associate Agreement (BAA) in our contract with them.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            },
            {
              "text": "We assume that third-party vendors who need access to our ePHI will indicate that and include a BAA with their contract with us.",
              "riskScore": 0,
              "education": "Take an active role in protecting your ePHI. Review your third-party vendor contracts to determine which third-party vendors are business associates and ensure fully executed BAAs are in place with all required business associates. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            },
            {
              "text": "I don't know. We have not formally considered which of our third-party vendors require access to ePHI.",
              "riskScore": 0,
              "education": "Take an active role in protecting your ePHI. Review your third-party vendor contracts to determine which third-party vendors are business associates and ensure fully executed BAAs are in place with all required business associates. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            },
            {
              "text": "We have informal discussions to evaluate whether access to our ePHI is required.",
              "riskScore": 0,
              "education": "Take an active role in protecting your ePHI. Review your third-party vendor contracts to determine which third-party vendors are business associates and ensure fully executed BAAs are in place with all required business associates. As user accounts are established, the accounts must be granted access to the organization's computers and programs, as appropriate to each user. Consider following the \"minimum necessary\" principle associated with the HIPAA Privacy Rule. Allow each user access only to the computers and programs required to accomplish that user's job or role in the organization. This limits the organization's exposure to unauthorized access, loss, and theft of data if the user's identity or access is compromised."
            }
          ]
        },
        {
          "id": "4",
          "text": "How does your practice enforce or monitor access for each of these business associates?",
          "responses": [
            {
              "text": "We determine degree of access based on the amount of ePHI accessed and the types of devices or mechanisms used for access. We control, enforce, and monitor third-party access using access management policies and procedures.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Implement access management procedures to track and monitor user access to computers and programs. Frequently viewing audit, system, and other logs to monitor what ePHI is being accessed by business associates will inform the need to enforce compliance or terminate contracts with the business associate."
            },
            {
              "text": "We assume that all business associate access is equal with regard to determining risk.",
              "riskScore": 0,
              "education": "Take an active role in protecting your ePHI. Determine the degree of access a business associate has by reviewing the amount of ePHI accessed, the types of devices and mechanisms used for access, and your ability to control and monitor their access. Document your procedures in your security policies. Implement access management procedures to track and monitor user access to computers and programs. Frequently viewing audit, system, and other logs to monitor what ePHI is being accessed by business associates will inform the need to enforce compliance or terminate contracts with the business associate."
            },
            {
              "text": "We do not consider degree of access as it pertains to business associates.",
              "riskScore": 0,
              "education": "Take an active role in protecting your ePHI. Determine the degree of access a business associate has by reviewing the amount of ePHI accessed, the types of devices and mechanisms used for access, and your ability to control and monitor their access. Document your procedures in your security policies. Implement access management procedures to track and monitor user access to computers and programs. Frequently viewing audit, system, and other logs to monitor what ePHI is being accessed by business associates will inform the need to enforce compliance or terminate contracts with the business associate."
            }
          ]
        },
        {
          "id": "5",
          "text": "How do business associates communicate important changes in security practices, personnel, etc. to you?",
          "responses": [
            {
              "text": "Our BAAs include language describing how security-relevant changes should be communicated to our organization.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We rely on our business associates to communicate with us in a manner they deem effective.",
              "riskScore": 0,
              "education": "Be sure to include or incorporate language in Business Associate Agreements describing their communication of relevant security changes to your practice."
            },
            {
              "text": "We are not sure how our business associates manage security or communicate changes to our practice.",
              "riskScore": 0,
              "education": "Be sure to include or incorporate language in Business Associate Agreements describing their communication of relevant security changes to your practice."
            }
          ]
        },
        {
          "id": "6",
          "text": "Have you executed business associate agreements with all business associates who create, receive, maintain, or transmit ePHI on your behalf?",
          "responses": [
            {
              "text": "Yes. We ensure all business associates have a fully executed BAA with us before creating, receiving, maintaining, or transmitting ePHI on our behalf.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "Yes. We assume business associates with whom we require a BAA will prompt us to put one in place.",
              "riskScore": 0,
              "education": "Make sure all business associates who access ePHI have a fully executed BAA with your practice before being granted access. Include this requirement in your security policies and procedures."
            },
            {
              "text": "No. We do not execute BAAs when we have business associates accessing ePHI.",
              "riskScore": 0,
              "education": "Make sure all business associates who access ePHI have a fully executed BAA with your practice before being granted access. Include this requirement in your security policies and procedures."
            }
          ]
        },
        {
          "id": "7",
          "text": "How do you maintain awareness of business associate security practices (i.e., in addition to Business Associate Agreements)?",
          "responses": [
            {
              "text": "Our practice performs extra due diligence in the form of monitoring third-party connections to our information systems or other forms of access, in addition to including language for security compliance in our Business Associate Agreements (BAAs).",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We rely on the language of our BAAs to ensure that business associates are securing ePHI.",
              "riskScore": 0,
              "education": "Consider monitoring, auditing, or obtaining information from business associates to ensure the security of ePHI and include language about this in Business Associate Agreements."
            },
            {
              "text": "We are not sure how to maintain awareness of our business associates' security practices.",
              "riskScore": 0,
              "education": "Consider monitoring, auditing, or obtaining information from business associates to ensure the security of ePHI and include language about this in Business Associate Agreements."
            }
          ]
        },
        {
          "id": "8",
          "text": "Do you include satisfactory assurances within your Business Associate Agreements pertaining to how your business associates safeguard ePHI?",
          "responses": [
            {
              "text": "Yes. Our Business Associate Agreements include specifications on authorized use and disclosure of ePHI as well as other requirements as required by the Omnibus Rule updates to HIPAA.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "Yes. BAAs include specifications on authorized use and disclosure of ePHI.",
              "riskScore": 0,
              "education": "Ensure all BAAs have been updated to meet the requirements of the HIPAA Security Rule and Omnibus Rule updates to HIPAA."
            },
            {
              "text": "No. We are not sure about what satisfactory assurances are included in our BAAs.",
              "riskScore": 0,
              "education": "Ensure all BAAs have been updated to meet the requirements of the HIPAA Security Rule and Omnibus Rule updates to HIPAA."
            }
          ]
        },
        {
          "id": "9",
          "text": "What terms are in your BAAs to outline how your business associates ensure subcontractors access ePHI securely?",
          "responses": [
            {
              "text": "In addition to language in our BAAs, our Business Associates provide specific assurances to us, including how they ensure subcontractors secure ePHI.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "Our BAAs include language requiring the business associate to obtain satisfactory assurances from subcontractors as to how they protect ePHI.",
              "riskScore": 0,
              "education": "Consider reviewing with your business associates how they manage security expectations for their subcontractors."
            },
            {
              "text": "We are not sure how to obtain satisfactory assurances from subcontractors.",
              "riskScore": 0,
              "education": "Ensure your practice can safeguard ePHI by ensuring the terms and conditions of your practice's BAAs outline appropriate requirements for your BAAs with subcontractors."
            }
          ]
        },
        {
          "id": "10",
          "text": "Do your BAAs require your third-party vendors to report security incidents to your practice in a timely manner?",
          "responses": [
            {
              "text": "Yes. Our BAAs describe requirements to provide satisfactory assurances for the protection of ePHI, obtain the same assurances from its subcontractors, and report security incidents (experienced by the Business Associate or its subcontractors) to our practice in a timely manner.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Make sure your point of contact with your business associate knows whom to contact at your organization to provide information about security incidents."
            },
            {
              "text": "No. We are not sure how this requirement is described within our BAAs.",
              "riskScore": 0,
              "education": "Your practice may not be able to safeguard its information systems and ePHI if your practice's Business Associates are not required to provide satisfactory assurances for the protection of ePHI, obtain the same assurances from its subcontractors, and report security incidents (experienced by the Business Associate or its subcontractors) to you in a timely manner. Make sure your point of contact with your business associate knows whom to contact at your organization to provide information about security incidents."
            }
          ]
        },
        {
          "id": "11",
          "text": "Have you updated all your BAAs to reflect the requirements in the 2013 Omnibus Rule updates to HIPAA?",
          "responses": [
            {
              "text": "We have reviewed all BAAs and have confirmed their compliance with the Omnibus Rule updates to HIPAA.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We have reviewed all BAAs and are in the process of updating formerly out-of-date BAAs.",
              "riskScore": 0,
              "education": "Update BAAs to reflect Omnibus Rule updates to HIPAA and HIPAA compliance."
            },
            {
              "text": "We assume all BAAs are up to date with the Omnibus Rule updates to HIPAA but have not reviewed the agreements to make sure.",
              "riskScore": 0,
              "education": "All BAAs should be reviewed to ensure compliance with the Omnibus Rule updates to HIPAA and HIPAA compliance."
            },
            {
              "text": "We are not sure if our BAAs are up to date with Omnibus Rule requirements.",
              "riskScore": 0,
              "education": "All BAAs should be reviewed to ensure compliance with the Omnibus Rule updates to HIPAA and HIPAA compliance."
            }
          ]
        },
        {
          "id": "12",
          "text": "How does your practice document all of its business associates requiring access to ePHI?",
          "responses": [
            {
              "text": "We maintain a current listing of all business associates with access to ePHI in addition to having Business Associate Agreements (BAAs) on file with any business associates with access to ePHI.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We maintain copies of fully executed BAAs on file for any business associates with access to ePHI.",
              "riskScore": 0,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Note that the Office for Civil Rights may request an inventory listing of your Business Associates in the event of an audit or investigation."
            },
            {
              "text": "We are not sure how these business associate relationships are documented.",
              "riskScore": 0,
              "education": "Knowing who provides services to your practice and the nature of the services is an important component of your security plan. Note that the Office for Civil Rights may request an inventory listing of your Business Associates in the event of an audit or investigation."
            }
          ]
        },
        {
          "id": "13",
          "text": "Do you obtain Business Associate Agreements (BAAs) from business associates who access another covered entity's ePHI on your behalf?",
          "responses": [
            {
              "text": "Yes. We make sure to have BAAs in place with covered entities for which we are Business Associates as well as subcontractors to those covered entities who contract with us.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "Yes. We make sure to have BAAs in place with covered entities for which we are Business Associates.",
              "riskScore": 0,
              "education": "Make sure your practice has BAAs in place with covered entities for which your practice is a Business Associate as well as subcontractors to those covered entities who contract with your practice"
            },
            {
              "text": "No. We do not obtain assurances from business associates who access another covered entity's ePHI on our behalf.",
              "riskScore": 0,
              "education": "Make sure your practice has BAAs in place with covered entities for which your practice is a Business Associate as well as subcontractors to those covered entities who contract with your practice"
            }
          ]
        },
        {
          "id": "14",
          "text": "Does the organization require business associates and third-party vendors to implement security requirements more stringent than required in the HIPAA Rules?",
          "responses": [
            {
              "text": "Yes, contracts with vendors or BAs outline requirements to follow the HIPAA Rules as applicable to BAs with additional cybersecurity protocols.",
              "riskScore": 1,
              "education": "This is the most effective of the options provided. The HIPAA Rules require a covered entity obtain satisfactory assurances from its business associates that it will appropriately safeguard PHI it receives or creates on behalf of the covered entity. Organizations could consider protocols within their business practice to include enhanced cybersecurity and supply chain requirements beyond those required by the HIPAA Rules that third parties can follow and how compliance with the requirements may be verified. Rules and protocols for information sharing between the organization and suppliers are detailed and included in contracts between the two."
            },
            {
              "text": "No, contracts with vendors or BAs outline requirements to follow the HIPAA Rules as applicable to BAs without additional cybersecurity protocols.",
              "riskScore": 0,
              "education": "The HIPAA Rules require a covered entity to obtain satisfactory assurances from its business associate that it will appropriately safeguard PHI it receives or creates on behalf of the covered entity. Organizations could consider protocols within their business practice to include enhanced cybersecurity and supply chain requirements beyond those required by the HIPAA Rules that third parties can follow and how compliance with the requirements may be verified. Rules and protocols for information sharing between the organization and suppliers are detailed and included in contracts between the two."
            }
          ]
        },
        {
          "id": "15",
          "text": "How do you track and verify business associate and third-party vendor compliance to security policies and where are these policies documented?",
          "responses": [
            {
              "text": "The organization has developed a risk management program with policies and procedures that guide the implementation and monitoring of business associate and third-party vendor activities related to cybersecurity compliance.",
              "riskScore": 1,
              "education": "This is the most effective of the options provided. The organization could require business associate and third-party vendor to disclose cybersecurity features, functions, and known vulnerabilities of their products and services for the life of the product or the term of service. Contracts could require evidence of performing acceptable security practices through self-attestation, conformance to known standards, certifications, or inspections. Business associates and third-party vendors could be monitored to ensure they are fulfilling their security obligations throughout the relationship lifecycle."
            },
            {
              "text": "The organization verifies business associate and third-party vendor status each year but does not perform evaluations.",
              "riskScore": 0,
              "education": "The organization could require business associates and third-party vendors to disclose cybersecurity features, functions, and known vulnerabilities of their products and services for the life of the product or the term of service. Contracts could require evidence of performing acceptable security practices through self-attestation, conformance to known standards, certifications, or inspections. Business associates and third-party vendors could be monitored to ensure they are fulfilling their security obligations throughout the relationship lifecycle."
            }
          ]
        },
        {
          "id": "1",
          "text": "Uncontrolled access to ePHI to business associates/vendors",
          "responses": [
            {
              "text": "Access to unauthorized segments of the network",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Carelessness causing disruption to computer systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Carelessness exposing ePHI",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Damage to public reputation due to breach",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disclosure of passwords and or login information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "ePHI accessed by unauthorized entities",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Exploiting unpatched systems and software",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to ePHI",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized modification to ePHI",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "2",
          "text": "Inadequate business associate/vendor agreements",
          "responses": [
            {
              "text": "Inability to hold third parties accountable to securing your ePHI",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Breach goes unreported due to lack of established communication requirements with third-party",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Provide sensitive information and ePHI without authorization",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Loss of support services or contracts",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Damage to public reputation or litigation",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "3",
          "text": "No security or privacy assurances obtained from business associates/vendors",
          "responses": [
            {
              "text": "Information system or facility access granted to unauthorized personnel",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Adversarial access to unauthorized network segments",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Corrective enforcement outcomes from regulatory agencies",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disclosure of passwords and or login information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Social engineering or hacking attack affecting third-party impacts your practice's data",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disruption of access to data due to inadequate contractor security controls",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to or modification of ePHI/sensitive information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Exploitation of unsecured third-party systems and software",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Information disclosure or theft (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "4",
          "text": "Failure to update or review business associate contracts",
          "responses": [
            {
              "text": "Contract termination due to expiration",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Provide sensitive information and ePHI without authorization",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Disruption of access to data due to contract dispute or lapse",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Inability to determine the criticality of access granted to third parties",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Fines, litigation, and financial penalties from non-compliance",
              "riskScore": 0,
              "education": ""
            }
          ]
        }
      ]
    },
    {
      "id": "section_7",
      "title": "Section 7 - Contingency Planning",
      "questions": [
        {
          "id": "1",
          "text": "Does your practice have a contingency plan in the event of an emergency?",
          "responses": [
            {
              "text": "Yes. We have a response plan in place that includes policies and procedures to follow in the event of an emergency such as cyberattack, natural disaster, and power outages.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. The contingency plan should be reviewed, tested, and updated periodically. As part of this you should determine what critical services and ePHI must be available during an emergency."
            },
            {
              "text": "No. We have no contingency plan in place at this time.",
              "riskScore": 0,
              "education": "Ensure your practice can operate effectively and efficiently under emergency by having a contingency plan. This should be included in your documented policies and procedures. The contingency plan should be reviewed, tested, and updated periodically. As part of this you should determine what critical services and ePHI must be available during an emergency."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Ensure your practice can operate effectively and efficiently under emergency by having a contingency plan. This should be included in your documented policies and procedures. The contingency plan should be reviewed, tested, and updated periodically. As part of this you should determine what critical services and ePHI must be available during an emergency."
            }
          ]
        },
        {
          "id": "2",
          "text": "Is your contingency plan documented?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Your contingency plan should be documented in your policies and procedures."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Your contingency plan should be documented in your policies and procedures."
            }
          ]
        },
        {
          "id": "3",
          "text": "Do you periodically update your contingency plan?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "Yes, but only if there are changes in our practice.",
              "riskScore": 0,
              "education": "Consider reviewing and updating your contingency plan on a periodic basis."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider reviewing and updating your contingency plan on a periodic basis."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider reviewing and updating your contingency plan on a periodic basis."
            }
          ]
        },
        {
          "id": "4",
          "text": "How do you ensure that your contingency plan is effective and updated appropriately?",
          "responses": [
            {
              "text": "We periodically review the plans contents, perform tests of the plan, and record the results. We revise the plan as needed and document this in policy.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We periodically review the plan's contents but do not perform any tests or exercises of the plan's effectiveness.",
              "riskScore": 0,
              "education": "Consider periodically testing the contingency plan for effectiveness. Maintain documentation of contingency plan testing and revisions in your policies and procedures."
            },
            {
              "text": "We periodically run tests or exercises of the plan's effectiveness, but we do not document these tests. We have not made updates to our contingency plan yet.",
              "riskScore": 0,
              "education": "Consider maintaining documentation of contingency plan testing and revisions in your policies and procedures."
            },
            {
              "text": "We do not review or test our contingency plan.",
              "riskScore": 0,
              "education": "Consider periodically reviewing and testing the contingency plan for effectiveness. Maintain documentation of contingency plan testing and revisions in your policies and procedures."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider periodically reviewing and testing the contingency plan for effectiveness. Maintain documentation of contingency plan testing and revisions in your policies and procedures."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Depending on what other actions your practice does to ensure your contingency plan is updated appropriately, you may want to consider periodically reviewing and testing the contingency plan for effectiveness. Maintain documentation of contingency plan testing and revisions in your policies and procedures."
            }
          ]
        },
        {
          "id": "5",
          "text": "Have you considered what kind of emergencies could damage critical information systems or prevent access to ePHI within your practice?",
          "responses": [
            {
              "text": "Yes and we have documented contingency plans for various types of emergencies.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "You should consider all natural and man-made disasters that could affect the confidentiality, integrity, and availability of ePHI. You should also document how you would respond in these situations to maintain security of ePHI in your policies and procedures."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "You should consider all natural and man-made disasters that could affect the confidentiality, integrity, and availability of ePHI. You should also document how you would respond in these situations to maintain security of ePHI in your policies and procedures."
            }
          ]
        },
        {
          "id": "6",
          "text": "What types of emergencies have you considered?",
          "responses": [
            {
              "text": "We have considered natural disasters, such as wildfire, damaging winds, floods, hurricanes, tornadoes, or earthquakes.",
              "riskScore": 0,
              "education": "You should consider infrastructure and man-made disasters that could affect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We have considered man-made disasters, such as vandalism, biochemical warfare, toxic emissions, or civil unrest/terrorism.",
              "riskScore": 0,
              "education": "You should consider all infrastructure and natural disasters that could affect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We have considered infrastructure issues, such as power outages, road blocks, building hazards, network or data center outages, and cyberattacks such as ransomware.",
              "riskScore": 0,
              "education": "You should consider all natural and man-made disasters that could affect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "All of the above.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "You should consider infrastructure, natural, and man-made disasters that could affect the confidentiality, integrity, and availability of ePHI."
            }
          ]
        },
        {
          "id": "7",
          "text": "Have you documented in your policies and procedures various emergency types and how you would respond to them?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Review and revise these documents based on testing and incident results."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider all natural and man-made disasters that could affect the confidentiality, integrity, and availability of ePHI. Document and test how you would respond in these situations to maintain security of ePHI in your policies and procedures."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider all natural and man-made disasters that could affect the confidentiality, integrity, and availability of ePHI. Document and test how you would respond in these situations to maintain security of ePHI in your policies and procedures."
            }
          ]
        },
        {
          "id": "8",
          "text": "Does your practice have policies and procedures in place to prevent, detect, and respond to security incidents?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Your practice may not be able to safeguard its information systems, applications, and ePHI if it does not have policies and procedures designed to help prevent, detect, and respond to security incidents."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Your practice may not be able to safeguard its information systems, applications, and ePHI if it does not have policies and procedures designed to help prevent, detect, and respond to security incidents."
            }
          ]
        },
        {
          "id": "9",
          "text": "How does your practice prevent, detect, and respond to security incidents?",
          "responses": [
            {
              "text": "We have a security incident response plan documented in our policies and procedures.",
              "riskScore": 0,
              "education": "Consider testing the security incident response plan periodically using a documented process. The incident plan should cover broad categories of incidents to prepare for. Testing the incident plan is an effective means of preparation and training. Describe requirements for users to report suspicious activities in the organization and for the cybersecurity department to manage incident response."
            },
            {
              "text": "As part of training exercises we periodically test our security incident response plan.",
              "riskScore": 0,
              "education": "Testing your incident response plan is an effective means of preparation and training. The incident plan should cover a range of categories to prepare for and should be documented in your policies and procedures. Also consider tracking security incident responses and outcomes and communicating them to the appropriate workforce members for security incident awareness and mitigation. Describe requirements for users to report suspicious activities in the organization and for the cybersecurity department to manage incident response."
            },
            {
              "text": "We track all security incident responses and outcomes and report them to our security officer. We then ensure proper mitigation procedures are followed in a timely manner.",
              "riskScore": 0,
              "education": "Consider documenting your incident response plan in your policies and procedures and testing the plan periodically using a documented process. The incident plan should cover broad categories of incidents to prepare for. Testing the incident plan is an effective means of preparation and training. Describe requirements for users to report suspicious activities in the organization and for the cybersecurity department to manage incident response."
            },
            {
              "text": "We communicate recent security incident responses and outcomes to our workforce for additional security awareness and prevention.",
              "riskScore": 0,
              "education": "Consider documenting your incident response plan in your policies and procedures and testing the plan periodically using a documented process. The incident plan should cover broad categories of incidents to prepare for. Testing the incident plan is an effective means of preparation and training. Describe requirements for users to report suspicious activities in the organization and for the cybersecurity department to manage incident response."
            },
            {
              "text": "All of the above.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Describe requirements for users to report suspicious activities in the organization and for the cybersecurity department to manage incident response."
            },
            {
              "text": "Our security incident response plan is tested as needed (for example, when activated in real-world situations) but not on a periodic basis.",
              "riskScore": 0,
              "education": "Consider documenting your incident response plan in your policies and procedures and testing the plan periodically using a documented process. The incident plan should cover broad categories of incidents to prepare for. Testing the incident plan is an effective means of preparation and training. Describe requirements for users to report suspicious activities in the organization and for the cybersecurity department to manage incident response."
            },
            {
              "text": "We do not have a process for managing security incidents or an incident response testing plan.",
              "riskScore": 0,
              "education": "Develop an incident response plan that covers broad categories of incidents to prepare for. Ensure that security incident response, reporting, and mitigation procedures are followed by workforce members, are conducted in a timely manner, and their outcomes are properly documented and communicated to the appropriate workforce members. Also consider testing the plan to ensure its effectiveness. Describe requirements for users to report suspicious activities in the organization and for the cybersecurity department to manage incident response."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Develop an incident response plan that covers broad categories of incidents to prepare for. Ensure that security incident response, reporting, and mitigation procedures are followed by workforce members, are conducted in a timely manner, and their outcomes are properly documented and communicated to the appropriate workforce members. Also consider testing the plan to ensure its effectiveness. Describe requirements for users to report suspicious activities in the organization and for the cybersecurity department to manage incident response."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Consider developing an incident response plan that covers broad categories of incidents to prepare for. Ensure that security incident response, reporting, and mitigation procedures are followed by workforce members, are conducted in a timely manner, and their outcomes are properly documented and communicated to the appropriate workforce members. Also consider testing the plan to ensure its effectiveness. Describe requirements for users to report suspicious activities in the organization and for the cybersecurity department to manage incident response."
            }
          ]
        },
        {
          "id": "10",
          "text": "Has your practice identified specific personnel as your incident response team?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Before an incident occurs, make sure you understand who will lead your incident investigation. Additionally, make sure you understand which personnel will support the leader during each phase of the investigation. At minimum, you should identify the top security expert who will provide direction to the supporting personnel."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Identify workforce members who need access to facilities in the event of an emergency, identify roles and responsibilities, and create a backup plan for accessing facilities and critical data. Before an incident occurs, make sure you understand who will lead your incident investigation. Additionally, make sure you understand which personnel will support the leader during each phase of the investigation. At minimum, you should identify the top security expert who will provide direction to the supporting personnel."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Identify workforce members who need access to facilities in the event of an emergency, identify roles and responsibilities, and create a backup plan for accessing facilities and critical data. Before an incident occurs, make sure you understand who will lead your incident investigation. Additionally, make sure you understand which personnel will support the leader during each phase of the investigation. At minimum, you should identify the top security expert who will provide direction to the supporting personnel."
            }
          ]
        },
        {
          "id": "11",
          "text": "How are members of your incident response team identified and trained?",
          "responses": [
            {
              "text": "Workforce members are trained on their role and responsibilities as part of the incident response team (upon hire) as well as periodic reminders of our internal policies and procedures and testing exercises.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. At minimum, you should identify the top security expert who will provide direction to the supporting personnel. Ensure that the leader is fully authorized to execute all tasks required to complete the investigation."
            },
            {
              "text": "Workforce members are trained on their role and responsibilities as part of the incident response team (upon hire).",
              "riskScore": 0,
              "education": "Train members of your incident response team both upon hire and during periodic review. Testing your incident response plan can be an effective training method. At minimum, you should identify the top security expert who will provide direction to the supporting personnel. Ensure that the leader is fully authorized to execute all tasks required to complete the investigation."
            },
            {
              "text": "Workforce members are verbally communicated about what their role and responsibility is on the incident response team, but this is not a formal process.",
              "riskScore": 0,
              "education": "Consider formally documenting and training workforce members on matters regarding their role and responsibility on the incident response team. Testing your incident response plan can be an effective training method. At minimum, you should identify the top security expert who will provide direction to the supporting personnel. Ensure that the leader is fully authorized to execute all tasks required to complete the investigation."
            },
            {
              "text": "We do not have a process to inform workforce members about their role and responsibility on the incident response team.",
              "riskScore": 0,
              "education": "Your practice may not be able to safeguard its information systems, applications, and ePHI if it does not identify members of its incident response team and assure workforce members are trained and that incident response plans are tested. At minimum, you should identify the top security expert who will provide direction to the supporting personnel. Ensure that the leader is fully authorized to execute all tasks required to complete the investigation."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Your practice may not be able to safeguard its information systems, applications, and ePHI if it does not identify members of its incident response team and assure workforce members are trained and that incident response plans are tested. At minimum, you should identify the top security expert who will provide direction to the supporting personnel. Ensure that the leader is fully authorized to execute all tasks required to complete the investigation."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Your practice may not be able to safeguard its information systems, applications, and ePHI if it does not identify members of its incident response team and assure workforce members are trained and that incident response plans are tested. At minimum, you should identify the top security expert who will provide direction to the supporting personnel. Ensure that the leader is fully authorized to execute all tasks required to complete the investigation."
            }
          ]
        },
        {
          "id": "12",
          "text": "Has your practice evaluated and determined which systems and ePHI are necessary for maintaining business-as-usual in the event of an emergency?",
          "responses": [
            {
              "text": "Yes, we have a process of evaluating all hardware and software systems, including those of business associates, to determine criticality of the systems and ePHI that would be accessed by executing our contingency plan. This is documented along with our asset inventory.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Define the standard practices for recovering IT/OT assets in the case of a disaster, including backup plans."
            },
            {
              "text": "Yes, we have identified which information systems are more critical than others, including those of business associates, but have not formally documented this in our contingency plan.",
              "riskScore": 0,
              "education": "Consider documenting this process and include all mission-critical systems in your contingency plan. Define the standard practices for recovering IT/OT assets in the case of a disaster, including backup plans."
            },
            {
              "text": "No, we have not implemented a process for identifying and assessing criticality of information systems.",
              "riskScore": 0,
              "education": "Consider evaluating all hardware and software systems, including those of business associates, to determine criticality of the systems and ePHI that would be accessed. Document this process and include all mission-critical systems in your contingency plan. Define the standard practices for recovering IT/OT assets in the case of a disaster, including backup plans."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider evaluating all hardware and software systems, including those of business associates, to determine criticality of the systems and ePHI that would be accessed. Document this process and include all mission-critical systems in your contingency plan. Define the standard practices for recovering IT/OT assets in the case of a disaster, including backup plans."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Consider evaluating all hardware and software systems, including those of business associates, to determine criticality of the systems and ePHI that would be accessed. Document this process and include all mission-critical systems in your contingency plan. Define the standard practices for recovering IT/OT assets in the case of a disaster, including backup plans."
            }
          ]
        },
        {
          "id": "13",
          "text": "How would your practice maintain access to ePHI in the event of an emergency, system failure, or physical disaster?",
          "responses": [
            {
              "text": "We have implemented procedures and mechanisms for obtaining necessary electronic protected health information during various types of emergencies.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We have mechanisms in place to obtain access to ePHI during an emergency but do not have procedures documenting how these mechanisms are to be utilized.",
              "riskScore": 0,
              "education": "Document procedures to describe how your practice will maintain access to ePHI in the event of an emergency, system failure, or physical disaster. Your practice might not be able to recover ePHI and other health information during an emergency or when systems become unavailable if it does not backup ePHI by saving an exact copy to a magnetic disk/tape or a virtual storage (e.g., cloud environment)."
            },
            {
              "text": "We do not have procedures or mechanisms to maintain access to ePHI in the event of an emergency.",
              "riskScore": 0,
              "education": "Document procedures to describe how your practice will maintain access to ePHI in the event of an emergency, system failure, or physical disaster. Your practice might not be able to recover ePHI and other health information during an emergency or when systems become unavailable if it does not backup ePHI by saving an exact copy to a magnetic disk/tape or a virtual storage (e.g., cloud environment)."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Document procedures to describe how your practice will maintain access to ePHI in the event of an emergency, system failure, or physical disaster. Your practice might not be able to recover ePHI and other health information during an emergency or when systems become unavailable if it does not backup ePHI by saving an exact copy to a magnetic disk/tape or a virtual storage (e.g., cloud environment)."
            }
          ]
        },
        {
          "id": "14",
          "text": "How would your practice maintain security of ePHI and crucial business processes before, during, and after an emergency?",
          "responses": [
            {
              "text": "We have robust contingency plans which provide for alternate site or other means for continued access to ePHI. We test them periodically to ensure continuity of security processes in an emergency setting.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We have contingency plans which will be used to maintain continuity of security processes during an emergency setting.",
              "riskScore": 0,
              "education": "Establish (and implement as needed) procedures to enable continuation of critical business processes for protection of the security of electronic protected health information while operating in emergency mode."
            },
            {
              "text": "We have not implemented a means of ensuring continuity of security processes in an emergency setting.",
              "riskScore": 0,
              "education": "Establish (and implement as needed) procedures to enable continuation of critical business processes for protection of the security of electronic protected health information while operating in emergency mode."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Establish (and implement as needed) procedures to enable continuation of critical business processes for protection of the security of electronic protected health information while operating in emergency mode."
            },
            {
              "text": "Other.",
              "riskScore": 0,
              "education": "Establish (and implement as needed) procedures to enable continuation of critical business processes for protection of the security of electronic protected health information while operating in emergency mode."
            }
          ]
        },
        {
          "id": "15",
          "text": "Do you have a plan for backing up and restoring critical data?",
          "responses": [
            {
              "text": "Yes, we have a plan for determining which data is critically needed, creating retrievable, exact copies of critical data and how to restore that data, including from alternate locations. We also test and revise the plan, as needed.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI. Define the standard practices for recovering IT/OT assets in the case of a disaster, including backup plans."
            },
            {
              "text": "Yes, we have a plan for creating retrievable, exact copies of critical data and how to restore that data. We do not have a process for testing and revising this plan.",
              "riskScore": 0,
              "education": "Consider conducting periodic tests of backup recovery procedures. Define the standard practices for recovering IT/OT assets in the case of a disaster, including backup plans."
            },
            {
              "text": "We do not have a data backup and restoration plan.",
              "riskScore": 0,
              "education": "You should establish and implement procedures to create and maintain retrievable exact copies of electronic protected health information. Consider implementing, documenting, and testing a data backup and restoration plan. Define the standard practices for recovering IT/OT assets in the case of a disaster, including backup plans."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "You should establish and implement procedures to create and maintain retrievable exact copies of electronic protected health information. Consider looking into whether your practice is implementing, documenting, and testing a data backup and restoration plan. Define the standard practices for recovering IT/OT assets in the case of a disaster, including backup plans."
            }
          ]
        },
        {
          "id": "16",
          "text": "How is your practice's emergency procedure activated?",
          "responses": [
            {
              "text": "Upon identification or initiation of an emergency situation, emergency procedures are activated according to documented procedure, such as by formal communication from the security officer or other designated personnel.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We do not have a procedure to ensure that the emergency procedure is activated consistently when emergency events are identified.",
              "riskScore": 0,
              "education": "Details about how and when to activate should be documented in the emergency procedure."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Details about how and when to activate should be documented in the emergency procedure."
            }
          ]
        },
        {
          "id": "17",
          "text": "How is access to your facility coordinated in the event of disasters or emergency situations?",
          "responses": [
            {
              "text": "We have written policies and procedures outlining facility access for the restoration of lost data under the Disaster Recovery Plan and Emergency Mode Operations Plan in the event of an emergency. Members of the workforce who need access to the facility in an emergency have been identified. Roles and responsibilities have been defined. A backup plan for accessing the facility and critical data is in place.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We have written policies and procedures outlining facility access for the restoration of lost data under the Disaster Recovery Plan and Emergency Mode Operations Plan in the event of an emergency, but it does not include all of the variables described above.",
              "riskScore": 0,
              "education": "Implement written policies and procedures outlining facility access for the restoration of lost data under the Disaster Recovery Plan and Emergency Mode Operations Plan in the event of an emergency. Ensure members of the workforce who need access to the facility in an emergency have been identified. Define workforce member roles and responsibilities. Ensure that a backup plan for accessing the facility and critical data is in place."
            },
            {
              "text": "We do not have a written plan for accessing the facility in the event of disasters or emergency situations.",
              "riskScore": 0,
              "education": "Implement written policies and procedures outlining facility access for the restoration of lost data under the Disaster Recovery Plan and Emergency Mode Operations Plan in the event of an emergency. Ensure members of the workforce who need access to the facility in an emergency have been identified. Define workforce member roles and responsibilities. Ensure that a backup plan for accessing the facility and critical data is in place."
            }
          ]
        },
        {
          "id": "18",
          "text": "How is your emergency procedure terminated after the emergency circumstance is over?",
          "responses": [
            {
              "text": "Upon the conclusion of the emergency situation, normal operations are resumed according to documented procedure, such as by formal communication from the security officer or other designated personnel.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We do not have a procedure to ensure that normal operations are resumed after the conclusion of an emergency.",
              "riskScore": 0,
              "education": "Details about how and when to terminate should be documented in the emergency procedure."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Details about how and when to terminate should be documented in the emergency procedure."
            }
          ]
        },
        {
          "id": "19",
          "text": "Do you formally evaluate the effectiveness of your security safeguards, including physical safeguards?",
          "responses": [
            {
              "text": "Yes.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "No.",
              "riskScore": 0,
              "education": "Consider conducting technical and non-technical evaluations of security policies and procedures. This should be done periodically and in response to changes in the security environment."
            },
            {
              "text": "I don't know.",
              "riskScore": 0,
              "education": "Consider conducting technical and non-technical evaluations of security policies and procedures. This should be done periodically and in response to changes in the security environment."
            }
          ]
        },
        {
          "id": "20",
          "text": "How do you evaluate the effectiveness of your security safeguards, including physical safeguards?",
          "responses": [
            {
              "text": "We have procedures in place to evaluate the effectiveness of our security policies and procedures, physical safeguards, and technical safeguards. Our evaluation is conducted periodically and in response to changes in the security environment.",
              "riskScore": 1,
              "education": "This is the most effective option among those provided to protect the confidentiality, integrity, and availability of ePHI."
            },
            {
              "text": "We have procedures in place to evaluate the effectiveness of our security policies and procedures, physical safeguards, and technical safeguards but we do not update them with any set frequency.",
              "riskScore": 0,
              "education": "Consider conducting technical and non-technical evaluations of security policies and procedures periodically and in response to changes in the security environment."
            },
            {
              "text": "We do not have a formal process to evaluate the effectiveness of our security safeguards.",
              "riskScore": 0,
              "education": "Consider conducting technical and non-technical evaluations of security policies and procedures. This should be done periodically and in response to changes in the security environment."
            }
          ]
        },
        {
          "id": "1",
          "text": "Failure to adopt a documented business contingency plan",
          "responses": [
            {
              "text": "Corrective enforcement outcomes from regulatory agencies",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Failure to define purpose, scope, roles/responsibilities, and/or management commitment",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Inability to demonstrate recovery objectives and restoration priorities",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Litigation due to not meeting minimum security requirements",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unguided procedures during downtime or unexpected event",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "2",
          "text": "Failure to update or review contingency plan procedures",
          "responses": [
            {
              "text": "Information disclosure or theft (ePHI, proprietary, intellectual, or confidential)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unauthorized access to or modification of ePHI/sensitive information",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Out-of-date documentation not reflecting the most recent expected procedures",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Inconsistent or inadequate contingency response due to uncertainty",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Unguided procedures during downtime or unexpected event",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "3",
          "text": "Lack of consideration to reasonably anticipated environmental threats",
          "responses": [
            {
              "text": "Damage to public reputation due to information breach/loss",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Physical damage to facility",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Financial loss from increased downtime of information systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Inability to recovery from system failure",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Increased recovery time during unexpected downtime of information systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Injury or death of personnel (employee, patient, guest)",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Loss of productivity",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Overheating of network devices due to increased ambient temperature",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Physical access granted to unauthorized persons or entities",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Power outage affecting the availability of critical security and information systems",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "4",
          "text": "Infrequent training provided to staff and personal regarding business contingency procedures",
          "responses": [
            {
              "text": "Damage to public reputation due to information breach/loss",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Financial loss from increased downtime of information systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Inability to recovery from system failure",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Increased recovery time during unexpected downtime of information systems",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Loss of productivity",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "5",
          "text": "Inadequate written procedures for security incident tracking and monitoring",
          "responses": [
            {
              "text": "Adversaries maintain exploitation capability due to security incidents being undetected or undocumented",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Failure to adopt remediation plan based on identified security incidents",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Failure to define purpose, scope, roles, responsibilities, and or management commitment pertaining to the tracking of security incidents",
              "riskScore": 0,
              "education": ""
            }
          ]
        },
        {
          "id": "6",
          "text": "Lack of access to ePHI during emergency events",
          "responses": [
            {
              "text": "Damage to public reputation",
              "riskScore": 0,
              "education": ""
            },
            {
              "text": "Lost revenue from canceled appointments",
              "riskScore": 0,
              "education": ""
            }
          ]
        }
      ]
    }
  ]
};
