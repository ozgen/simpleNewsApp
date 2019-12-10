import {STRINGS, CATEGORIES, REFS, KEYS, ALIGNMENTS, FONTS, COLORS, PN_RECEIVER_GROUPS} from '../assets/constants.js';
import React, {Component} from 'react';
import {Image} from 'react-native';
import Modal from "react-native-modal"
import ToggleSwitch from 'toggle-switch-react-native'
import {
    Alert,
    View,
    Text,
    Dimensions,
    RefreshControl,
    StatusBar,
    ActivityIndicator,
    NetInfo,
    FlatList,
    TouchableOpacity,
    TouchableHighlight,
    SectionList
} from 'react-native';
import _ from 'lodash';

import * as Amplitude from 'expo-analytics-amplitude';
import { isBeingNotified, addNotificationSetting, removeNotificationSetting } from './FollowInfoStorage.js';

const amplitude = Amplitude.initialize(KEYS.AMPLITUDE_API);

//A map between categories names and their codes
const {width, height} = Dimensions.get('window');
var selectedCategory = STRINGS.FEATURED_HEADLINES; //The currently selected category


const styles = {
  listItem: { flex: 1, maxHeight: 60, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'grey'}
}
export default class SettingsPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isOn: {
              [PN_RECEIVER_GROUPS.BREAKING]: false,
              [PN_RECEIVER_GROUPS.DAILY]: false,
              [PN_RECEIVER_GROUPS.WEEKLY]: false
            }
        };
    }

    async componentDidMount() {
      this.updateNotificationSettings();
    }

    async updateNotificationSettings() {
      this.setState({
        isOn: {
          //[PN_RECEIVER_GROUPS.BREAKING]: await isBeingNotified(PN_RECEIVER_GROUPS.BREAKING),
          [PN_RECEIVER_GROUPS.DAILY]: await isBeingNotified(PN_RECEIVER_GROUPS.DAILY),
          //[PN_RECEIVER_GROUPS.WEEKLY]: await isBeingNotified(PN_RECEIVER_GROUPS.WEEKLY)
        }
      });
    }

    async toggleNotificationSetting(name) {
      if (this.state.isOn[name]) {
        await removeNotificationSetting(name);
      }
      else {
        await addNotificationSetting(name);
      }
      await this.updateNotificationSettings();
    }

    ToggleSwitch = ({receiverGroup}) => {
      return <ToggleSwitch
      isOn={this.state.isOn[receiverGroup]}
      onColor='green'
      offColor='grey'
      size='small'
      onToggle={ () => this.toggleNotificationSetting(receiverGroup) }
      />
    }

    render() {
      return (
        <Modal
            style = {{
              backgroundColor: 'white'}}
              isVisible={this.props.visible}
              >

          {/* Header */}
          <View
            style = {{
              marginTop: 0,
              borderBottomWidth: 4,
              borderColor: 'grey',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              maxHeight: 80
            }}>

            <Text style= {{
              fontFamily: 'PT Serif',
              fontSize: 24
            }}>Bildirim Ayarları</Text>

            <Text style= {{
              fontFamily: 'PT Serif'
            }}>Her gün gündemden haberdar olmak ister misiniz?</Text>

          </View>

          <View
            style = {{
              flex: 2,
              backgroundColor: 'white',
            }}>

           {/* <View style = {styles.listItem}>
              <View style = {{margin: 10, flex: 1, alignItems: 'center'}}>
                <Image
                style={{ width: 35, height: 35 }}
                source={require('../media/breaking.png')}></Image>
              </View>

              <View style = {{flex: 4, margin: 5}}>
                <Text style = {{fontSize: 16, fontFamily: 'PT Serif'}}>Breaking News</Text>
                <Text style = {{fontSize: 13, fontFamily: 'PT Serif'}}>Important stories, as they happen</Text>
              </View>

              <View style = {{margin: 15, flex: 1, alignItems: 'center'}}>
              <this.ToggleSwitch receiverGroup={PN_RECEIVER_GROUPS.BREAKING}/>
              </View>

            </View>*/}

            <View style = {styles.listItem}>
              <View style = {{margin: 10, flex: 1, alignItems: 'center'}}>
                <Image
                style={{ width: 35, height: 35 }}
                source={require('../media/sunicon.png')}></Image>
              </View>

              <View style = {{flex: 4, margin: 5}}>
                <Text style = {{fontSize: 16, fontFamily: 'PT Serif'}}>Her Gün</Text>
                <Text style = {{fontSize: 13, fontFamily: 'PT Serif'}}>Günlük yayınlanan her haberde bildirim gönderilecektir.</Text>
              </View>

              <View style = {{margin: 15, flex: 1, alignItems: 'center'}}>
              <this.ToggleSwitch receiverGroup={PN_RECEIVER_GROUPS.DAILY}/>
              </View>

            </View>

         {/*   <View style = {styles.listItem}>
              <View style = {{margin: 10, flex: 1, alignItems: 'center'}}>
                <Image
                style={{ width: 32, height: 32 }}
                source={require('../media/calendaricon.png')}></Image>
              </View>

              <View style = {{flex: 4, margin: 5}}>
                <Text style = {{fontSize: 16, fontFamily: 'PT Serif'}}>Every week</Text>
                <Text style = {{fontSize: 13, fontFamily: 'PT Serif'}}>Weekly Leland's Digest</Text>
              </View>

              <View style = {{margin: 15, flex: 1, alignItems: 'center'}}>
              <this.ToggleSwitch receiverGroup={PN_RECEIVER_GROUPS.WEEKLY}/>
              </View>

            </View>*/}

          </View>


          <View style = {{margin: 20, alignItems: 'center'}}>
              <TouchableOpacity
                style = {{
                  height: 40,
                  width: 200,
                  padding: 10,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor:'black'}}
                onPress={() => {this.props.setModalVisible(!this.props.modalVisible);

                }}>
                <Text style={{
                  marginTop: 2,
                  alignSelf: 'center',
                  color: 'white',
                  fontFamily: 'Hoefler Text',
                  fontWeight: 'bold',
                  fontSize: 15,
                  }}>Close</Text>
              </TouchableOpacity>
            </View>
          </Modal>
      )
    }
}
