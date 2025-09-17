import {Message} from "./message.ts";

export class Messages {
    static readonly AND = Message.getParamMsg(['first'], ' and ', ['second']);
    static readonly COMMA = Message.getParamMsg(['first'], ', ', ['second']);
    static readonly OR = Message.getParamMsg(['first'], ' or ', ['second']);
    static readonly FIELD = Message.FIELD;
    static readonly NOT_APPLICABLE = Message.getParamMsg('N/A');
    static readonly PAGE_X_OF_Y = Message.getParamMsg('Page ', ['x'], ' of ', ['y']);
    static readonly NOT_READY = Message.getParamMsg('Not ready');
    static readonly VALID = Message.getParamMsg('Valid');
    static readonly INVALID = Message.getParamMsg('Invalid');
    static readonly INVALID_VALUE_0 = Message.getParamMsg('Invalid value ', ['val']);
    static readonly NONE = Message.getParamMsg('None');
    static readonly NUMBER_NOT_IN_RANGE = Message.getParamMsg('Must be between ', ['min'], ' and ', ['max']);
    static readonly NUMBER_NOT_IN_RANGE_STEP = Message.getParamMsg('Must be between ', ['min'], ' and ', ['max'], ', step size ', ['step']);
    static readonly MUST_BE_RANGE_STEP = Message.getParamMsg('Must be between ', ['ranges'], ', step size ', ['step']);
    static readonly MUST_BE_RANGE = Message.getParamMsg('Must be between ', ['ranges']);
    static readonly MUST_BE = Message.getParamMsg('Must be ', ['ranges']);
    static readonly MUST_BE_STEP = Message.getParamMsg('Must be ', ['ranges'], ', step size ', ['step']);
    static readonly MUST_BE_DISTINCT = Message.getParamMsg('Must be of value: ', ['mesg']);
    static readonly NO_VALID_RANGES = Message.getParamMsg('No Valid Ranges. ', ['mesg']);
    static readonly MIN_MAX = Message.getParamMsg('Min: ', ['min'], ', Max: ', ['max']);
    static readonly MIN_MAX_RANGES = Message.getParamMsg('In: ', ['ranges']);
    static readonly MIN_MAX_STEP = Message.getParamMsg('Min: ', ['min'], ', Max: ', ['max'], ', Step: ', ['step']);
    static readonly MIN_STEP = Message.getParamMsg('Min: ', ['min'], ', Step: ', ['step']);
    static readonly MIN_TO_MAX = Message.getParamMsg(['min'], ' to ', ['max']);
    static readonly MIN_0 = Message.getParamMsg('Min: ', ['min']);
    static readonly MIN_MAX_RANGES_STEP = Message.getParamMsg('In: ', ['ranges'], ', Step: ', ['step']);
    static readonly CANNOT_BE_EMPTY = Message.getParamMsg('Cannot be empty');
    static readonly INVALID_VALUE = Message.getParamMsg('Invalid Value');
    static readonly __UNKNOWN_VAL = Message.getParamMsg('?');
    static readonly UNKNOWN_VAL = Message.getParamMsg('Unknown ', ['val']);
    static readonly INVALID_CHARACTER = Message.getParamMsg('Invalid Character');
    static readonly MUST_BE_AT_LEAST_0_CHARACTORS = Message.getParamMsg('Must be at least ', ['n'], ' character long.');
    static readonly MAX_LENGTH_0 = Message.getParamMsg('Maximum Length ', ['len'], '.');
    static readonly INVALID_LENGTH = Message.getParamMsg('Invalid Length');
    static readonly BLANK = Message.getParamMsg('');
    static readonly NOT_SPECIFIED = Message.getParamMsg('Not Specified');
    static readonly INVALID_EXPRESSION = Message.getParamMsg('Invalid Expression');
    static readonly NEXT = Message.getParamMsg('Next');
    static readonly PREVIOUS = Message.getParamMsg('Previous');
    static readonly FINISH = Message.getParamMsg('Finish');
    static readonly TRAFFIC_CLASS = Message.getParamMsg('Traffic Class');
    static readonly UNCHANGED = Message.getParamMsg('unchanged');
    static readonly DEFAULT = Message.getParamMsg('Default');

    /**
     * combines multiple messages, this logic may need to be changed for different languages
     */
    static join(messages:(Message|any)[], joiner:Message= Messages.AND) {
        let first = new Message('');
        let i  = 0;
        for (let msg of messages) {
            if (msg && msg.toString() !== '') {
                first = msg;
                break;
            }
            i++;
        }
        i++;

        for (; i < messages.length; i++) {
            let second = messages[i];
            if (second && second.toString() !== '') {
                first = joiner.resolve({first: first, second: second});
            }
        }
        return first;
    };

}



