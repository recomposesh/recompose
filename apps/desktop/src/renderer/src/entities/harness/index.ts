export {
  type ClientGroup,
  clientNamed,
  clientsMatching,
  connectClients,
  connectGroups,
} from './model/connect-catalog';
export { connectFactsFor } from './model/connect-facts-for';
export {
  addressFor,
  type ConnectClient,
  type ConnectFacts,
  type ConnectModel,
  type ConnectStep,
  keyIsAStandIn,
} from './model/connect-facts';
export { servingGateway } from './testing/connect-facts.testkit';
export { ClientLead } from './ui/client-lead/client-lead';
