import {STRINGS, CATEGORIES, REFS, KEYS, ALIGNMENTS, FONTS, COLORS} from '../assets/constants.js';
import React, {Component} from 'react';
import {Image} from 'react-native';
import {AsyncStorage} from "react-native";
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
import Drawer from 'react-native-drawer'

//Components for this app imports
import Header from './common/header';
import NewsFeedItem from './common/newsfeed-item';
import Placeholder from './common/placeholder';
import SettingsPage from './SettingsPage.js';
import _ from 'lodash';
import {version} from "../../app.json";

//Styles for the page
import styles from './styles/headlines';

import * as Amplitude from 'expo-analytics-amplitude';
import FollowButton from './common/FollowButton.js';

const amplitude = Amplitude.initialize(KEYS.AMPLITUDE_API);

//A map between categories names and their codes
const {width, height} = Dimensions.get('window');
var selectedCategory = STRINGS.FEATURED_HEADLINES; //The currently selected category
//var SettingsPageModal = require('./SettingsPage.js');

export default class Headlines extends Component {
    constructor(props) {
        super(props);
        this.state = {
            modalVisible: false,
            selectedCategory: STRINGS.FEATURED_HEADLINES,
            refreshing: false,
            loading: false,
            selectedCategoryData: [
              {category: selectedCategory, postObj: STRINGS.PLACEHOLDER, key: 'p1'},
              {category: selectedCategory, postObj: STRINGS.PLACEHOLDER, key: 'p2'}
            ],
            width: width <= height ? width : height,
            height: Dimensions.get('window').height,
        };
        this.currPosts = {}; //A hash of all current posts
        for (var category in CATEGORIES) {
          // skip loop if the property is from prototype
          if (!CATEGORIES.hasOwnProperty(category)) continue;
          this.currPosts[category] = {page: 1, posts:[], hashed:{}};
        }
        this.fetchDataIsBusy = true; //Used to handle concurrency
        this.goToPost = this.goToPost.bind(this); //The function that goes to the post screen
        this._renderRow = this._renderRow.bind(this); //A function used by the listView to render each row
        this.drawerHandler = this.drawerHandler.bind(this); //A function used the header to handle drawer opening
        this.searchHandler = this.searchHandler.bind(this);

        Dimensions.addEventListener('change', () => {
          const {width, height} = Dimensions.get('window')
          this.setState({width: width <= height ? width : height, height: height});
          // console.warn("orientation changed");
        });
    }

    _toggleModal = () =>
    this.setState({ modalVisible: !this.state.modalVisible });

    //Given data, it passes it to Post view
    goToPost(data) {
      this.props.navigation.navigate(STRINGS.POST, { ...data });
    }


    async componentDidMount() {
      Amplitude.setUserProperties({"expo_version": version});
      Amplitude.logEvent(STRINGS.APP_OPENED);
      if (!(await AsyncStorage.getItem('notification_settings'))) {
        this.setState({modalVisible: true});
      }
      this.loadMore();
    }

    //Opens the drawer
    drawerHandler() {
      this.refs.drawer.open();
    }

    searchHandler() {
      this.props.navigation.navigate(STRINGS.SEARCH, {});
    }

    //Converts all fetched data to a map of <Category> => <Article>
    convertDataToMap(category) {
      // this.setState({dataSource: this.state.dataSource.cloneWithRows(newArray)});
      if (category !== selectedCategory) return;
      var newArray = this.currPosts[selectedCategory][STRINGS.POSTS].slice();
      //Puts in some placeholders when needed
      if(newArray.length === 0) {
        newArray.push({category: selectedCategory, postObj: STRINGS.PLACEHOLDER, key: 'p1'});
        newArray.push({category: selectedCategory, postObj: STRINGS.PLACEHOLDER, key: 'p2'});
      }
      Amplitude.logEvent(STRINGS.ARTICLES_PREVIEW_REQUEST, {category: selectedCategory});
      this.setState({selectedCategoryData: newArray});
    }

    //Sends the fetch request, populates data with the new articles and alerts listView about potential change
    //Specific to category articles
    async fetchNewCategoryHeadlines(category, categoryURL, loadMore) {
      let response = await fetch(categoryURL);
      let responseData = await response.json();
      var counter = 0;
      var view = this;
      responseData.forEach(function(post) {
        if(view.currPosts[category][STRINGS.HASHED][post.id] === undefined) {
          view.currPosts[category][STRINGS.HASHED][post.id] = 1;
          var postObject = {category: category, postObj: post, key: post.id};
          if(loadMore === true) {
            view.currPosts[category][STRINGS.POSTS].push(postObject);
          } else {
            view.currPosts[category][STRINGS.POSTS].splice(counter,0,postObject);
            counter += 1;
          }
        }
      });
      this.convertDataToMap(category);
      return counter;
    }

    //Determines the page and code for the category fetching, and calls the above function
    async handleCategoryFetching(counter, loadMore, category) {
      let categoryURL = STRINGS.REQUEST_SMALL_PAGE +counter+STRINGS.CATEGORIES_URL+CATEGORIES[category];
      if(category === STRINGS.ALL) {
        categoryURL = STRINGS.REQUEST_SMALL_PAGE+counter;
      }
      return await this.fetchNewCategoryHeadlines(category, categoryURL, loadMore);
    }

    //Handles all requests to fetch more data, and figures out whether it should get category only or also featured headlines too
    async fetchData(loadMore, category) {
      if (loadMore || this.currPosts[category][STRINGS.PAGE] === 1) {
        await this.handleCategoryFetching(this.currPosts[category][STRINGS.PAGE],loadMore,category);
      } else {
        var counter = 1;
        while (true) {
          var refreshed = await this.handleCategoryFetching(counter,loadMore,category);
          if (refreshed !== 3) break;
          counter += 1;
        }
      }
      this.fetchDataIsBusy = false;
    }

    //Handles loading more articles
    async loadMore(event) {
      if (!this.state.loading) {
        this.setState({loading: true}); // todo: properly wait for this to finish.
        await this.fetchData(true, (' ' + selectedCategory).slice(1)); //Fetches featured headlines and category articles
        this.currPosts[selectedCategory][STRINGS.PAGE] += 1;
        this.setState({loading: false});
      }
    }

    //Handles refreshing
    async _onRefresh() {
      this.fetchDataIsBusy = true;
      this.setState({refreshing: true});
      await this.fetchData(false, (' ' + selectedCategory).slice(1));
      this.setState({refreshing: false});
    }

    //Changes category, clears old posts, and sends a new request to fetch more posts
    async setCategory(value) {
      if (value === selectedCategory) return;
      // this.currPosts[selectedCategory]["page"] = 1;
      selectedCategory = value;
      this.setState({selectedCategory: value});
      Amplitude.logEvent(STRINGS.CATEGORY_CHANGED, {category: selectedCategory});
      // this.currPosts[selectedCategory] = {page: 1, posts:[], hashed:{}};
      this.convertDataToMap((' ' + selectedCategory).slice(1));
      this.refs.listview.scrollToLocation({animated: false, sectionIndex:0, itemIndex:0, viewPosition:2});
      this.fetchDataIsBusy = true;
      await this.fetchData(false, (' ' + selectedCategory).slice(1));
    }

    //Renders the headers for the sections
    renderSectionHeader() {
       return (
         <View style={styles.categoriesHeaderContainer}>
           <View style={{flexDirection: ALIGNMENTS.ROW}}>
             <Text style={styles.categoriesText}>
               {selectedCategory}
             </Text>

             <View>
              <FollowButton type="category" id={parseInt(CATEGORIES[this.state.selectedCategory])} />
             </View>
           </View>
         </View>
     )
   }

   //Handles rendering rows by calling the NewsFeedItem and passing data to it
  _renderRow(data) {
    // console.log("This is my id", data.item.key);
    if(data.item.postObj !== STRINGS.PLACEHOLDER) {
      return <NewsFeedItem key={data.item.key} postID={data.item.key} data={data.item} onPress={this.goToPost} context={STRINGS.HEADLINES}
      onAuthorPress = {authorID=>this.props.navigation.navigate("AuthorDetail", { id: authorID})} />

    } else {
      return (
        <View>
          <Placeholder />
        </View>
      );
    }
  }

  constructSideMenuList() {
    var categoriesList = [];
    for (var category in CATEGORIES) {
      // skip loop if the property is from prototype
      if (!CATEGORIES.hasOwnProperty(category)) continue;
      categoriesList.push({key: category});
    }
    return categoriesList;
  }

  setTextStyle(category) {
    if (category === selectedCategory) {
      return {color: COLORS.DARK_YELLOW, fontFamily: FONTS.CENTURY, textAlign: ALIGNMENTS.CENTER};
    }
    return {color: COLORS.DARK_GRAY, fontFamily: FONTS.CENTURY, textAlign: ALIGNMENTS.CENTER};
  }
  //A method to render the drawer/side menu
  sideMenu() {
    return (
      <View style={styles.sideMenuContainer}>

        <View style={styles.sideBarTitle}>
          <Text style={styles.sideBarTitleText}> Haftalık Gündem </Text>
        </View>
        <FlatList
          data={this.constructSideMenuList()}
          style={styles.flatListStyle}
          renderItem={({item}) =>
            <TouchableOpacity onPress={() => {this.setCategory(item.key); this.refs.drawer.close()}}>
              <View style={styles.sideMenuItem}>
                <Text style={this.setTextStyle(item.key)}>{item.key}</Text>
              </View>
            </TouchableOpacity>
          }
        />
                <TouchableHighlight style={{
                  margin: 8,
                  borderRadius: 5,
                  alignSelf: "center",
                  //backgroundColor: "maroon"
                }}>
                  <TouchableOpacity
                    onPress={() => this._toggleModal()}>
                          <Image
                          style={{margin: 3,
                            alignSelf: "center",
                            width: 25,
                            height: 25 }}
                          source={require('../media/gears.png')}
                      />
                      <Text style={{
                        fontSize: 13,
                        fontFamily: "Hoefler Text",
                        color: COLORS.BLACK,
                        alignSelf: "center"
                      }}>
                       Bildirim Ayarları
                    </Text>
                  </TouchableOpacity>
                </TouchableHighlight>
      </View>

    )
  }

  //Required ReactNative function
  //For this screen we render
  /* <View for the page>
     <Set Status Bar props>
     <Show the header>
     <MenuContext states that we will use the Menu component>
     <ListView for the articles>
  */
  render() {
    return (
      <Drawer
      type={STRINGS.STATIC}
      ref={REFS.DRAWER}
      content={this.sideMenu()}
      openDrawerOffset={0.4}
      styles={drawerStyles}
      tweenHandler={Drawer.tweenPresets.parallax}
      captureGestures={true}
      negotiatePan={true}
      tapToClose={true}
      onOpenStart={() => StatusBar.setHidden(true)}
      onCloseStart={() => StatusBar.setHidden(false)}
      >
      {/*uses the modal page, called at top of render function, for when user first opens menu.*/}
      <View>
        <SettingsPage
          visible={this.state.modalVisible}
          setModalVisible = {() => this._toggleModal()}
        />
      </View>

        <Header ref={REFS.HEADER} drawerHandler={this.drawerHandler} searchHandler={this.searchHandler}/>
        <View ref={REFS.VIEW} style={{flex: 1, backgroundColor:COLORS.GHOST_WHITE, alignItems:'center'}}>
        <StatusBar
          ref={REFS.STATUS_BAR}
          barStyle={STRINGS.LIGHT_CONTENT}
        />
        <SectionList
            ref={REFS.LIST}
            removeClippedSubviews={false}
            disableVirtualization={true}
            refreshing={this.state.refreshing}
            keyExtractor={item => item.key}
            onRefresh={this._onRefresh.bind(this)}
            onEndReached={this.loadMore.bind(this)}
            sections={[{data: this.state.selectedCategoryData, key: this.state.selectedCategory}]}
            renderItem={this._renderRow}
            //renderSectionHeader={() => this.renderSectionHeader()}
            ListFooterComponent={() => <ActivityIndicator style={styles.loadingIndicator}/>}
            contentContainerStyle={{width: this.state.width}}
        />
        </View>
      </Drawer>

    )
  }
}
const drawerStyles = {
  drawer: { shadowColor: COLORS.BLACK, shadowOpacity: 0.8, shadowRadius: 3},
}

//
